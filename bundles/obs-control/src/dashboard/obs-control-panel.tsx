/// <reference path="../../../../shared/types/global.d.ts" />
import React, { useEffect, useState, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  OBSState,
  OBSScene,
  OBSConnectionSettings,
  OBSSceneItem,
  OBSMediaState,
  OBSPlaylistItem,
} from "../../../../shared/types/obs.types";
import "./obs-control-panel.css";

// ===== 工具函数 =====

/**
 * 将毫秒转换为 HH:MM:SS 格式
 */
const formatTime = (ms: number | null): string => {
  if (ms === null || ms < 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

/**
 * 将 HH:MM:SS 时间戳字符串转换为毫秒
 */
const parseTimestamp = (timestamp: string): number | null => {
  const match = timestamp.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  if (minutes >= 60 || seconds >= 60) return null;
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
};

/**
 * 从文件路径中提取文件名
 */
const getFileName = (filePath: string): string => {
  if (!filePath) return "未知";
  const parts = filePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filePath;
};

// ===== 判断是否为媒体源 =====
const isMediaSource = (inputKind: string | null): boolean => {
  if (!inputKind) return false;
  return inputKind === "vlc_source" || inputKind === "ffmpeg_source";
};

const isVlcSource = (inputKind: string | null): boolean => {
  return inputKind === "vlc_source";
};

// ===== VLC播放列表弹窗组件 =====
const PlaylistDialog = ({
  playlist,
  onClose,
  onPlayItem,
}: {
  playlist: OBSPlaylistItem[];
  onClose: () => void;
  onPlayItem: (index: number) => void;
}) => {
  return (
    <div className="playlist-overlay" onClick={onClose}>
      <div className="playlist-modal" onClick={(e) => e.stopPropagation()}>
        <div className="playlist-header">
          <h4 className="playlist-title">📋 Playlist</h4>
          <button onClick={onClose} className="playlist-close-btn">
            ✕
          </button>
        </div>
        {playlist.length === 0 ? (
          <p className="playlist-empty">Playlist is empty</p>
        ) : (
          <ul className="playlist-list">
            {playlist.map((item, idx) => (
              <li
                key={idx}
                className={`playlist-item ${
                  item.selected
                    ? "playlist-item--active"
                    : item.hidden
                      ? "playlist-item--hidden"
                      : "playlist-item--normal"
                }`}
              >
                {/* 播放按钮 */}
                <button
                  onClick={() => onPlayItem(idx)}
                  className={`media-btn${item.selected ? " playlist-play-btn--active" : ""}`}
                  title={`Play: ${getFileName(item.value)}`}
                >
                  ▶
                </button>
                <span className="playlist-item-index">{idx + 1}.</span>
                <span className="playlist-item-name">
                  {getFileName(item.value)}
                </span>
                {item.selected && (
                  <span className="playlist-item-playing-icon">🔊</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ===== 媒体控制面板组件 =====
const MediaControlPanel = ({
  obsId,
  sourceName,
  inputKind,
}: {
  obsId: string;
  sourceName: string;
  inputKind: string | null;
}) => {
  // 媒体状态
  const [mediaState, setMediaState] = useState<string>("");
  const [mediaCursor, setMediaCursor] = useState<number | null>(null);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  // 进度条拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  // 时间戳编辑
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  // 媒体文件名（通过GetInputSettings获取）
  const [mediaFileName, setMediaFileName] = useState<string>("");
  // VLC播放列表
  const [playlist, setPlaylist] = useState<OBSPlaylistItem[]>([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  // 轮询定时器引用
  const pollingRef = useRef<number | null>(null);

  // 获取媒体状态
  const fetchMediaStatus = useCallback(() => {
    nodecg
      .sendMessageToBundle("getMediaStatus", "obs-control", {
        id: obsId,
        inputName: sourceName,
      })
      .then((status: any) => {
        setMediaState(status.mediaState || "");
        if (!isDragging) {
          setMediaCursor(status.mediaCursor);
        }
        setMediaDuration(status.mediaDuration);
      })
      .catch(() => {
        // 静默处理轮询错误
      });
  }, [obsId, sourceName, isDragging]);

  // 获取媒体文件名
  const fetchFileName = useCallback(() => {
    nodecg
      .sendMessageToBundle("getInputSettings", "obs-control", {
        id: obsId,
        inputName: sourceName,
      })
      .then((settings: any) => {
        // Media Source: local_file 字段
        if (settings.local_file) {
          setMediaFileName(getFileName(settings.local_file));
        }
        // VLC Source: playlist 数组
        if (settings.playlist && Array.isArray(settings.playlist)) {
          // 从播放列表中找到当前播放的项
          const selected = settings.playlist.find((p: any) => p.selected);
          if (selected) {
            setMediaFileName(getFileName(selected.value));
          } else if (settings.playlist.length > 0) {
            setMediaFileName(getFileName(settings.playlist[0].value));
          }
        }
      })
      .catch(() => {});
  }, [obsId, sourceName]);

  // 启动状态轮询（每秒）
  useEffect(() => {
    fetchMediaStatus();
    fetchFileName();

    pollingRef.current = window.setInterval(() => {
      fetchMediaStatus();
    }, 1000);

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, [fetchMediaStatus, fetchFileName]);

  // 媒体操作
  const triggerAction = (action: string) => {
    nodecg
      .sendMessageToBundle("triggerMediaAction", "obs-control", {
        id: obsId,
        inputName: sourceName,
        action,
      })
      .then(() => {
        // 操作后立即刷新状态和文件名
        setTimeout(() => {
          fetchMediaStatus();
          fetchFileName();
        }, 300);
      })
      .catch((err: any) => console.error("Media action failed:", err));
  };

  // 进度条拖拽完成
  const handleSeek = (value: number) => {
    nodecg
      .sendMessageToBundle("setMediaCursor", "obs-control", {
        id: obsId,
        inputName: sourceName,
        cursor: value,
      })
      .catch((err: any) => console.error("Seek failed:", err));
    setMediaCursor(value);
    setIsDragging(false);
  };

  // 时间戳手动输入提交
  const handleTimeSubmit = () => {
    const ms = parseTimestamp(timeInput);
    if (ms !== null) {
      handleSeek(ms);
    }
    setEditingTime(false);
  };

  // 查看VLC播放列表
  const handleShowPlaylist = () => {
    nodecg
      .sendMessageToBundle("getInputSettings", "obs-control", {
        id: obsId,
        inputName: sourceName,
      })
      .then((settings: any) => {
        if (settings.playlist && Array.isArray(settings.playlist)) {
          setPlaylist(
            settings.playlist.map((item: any) => ({
              value: item.value || "",
              selected: !!item.selected,
              hidden: !!item.hidden,
            })),
          );
        } else {
          setPlaylist([]);
        }
        setShowPlaylist(true);
      })
      .catch((err: any) => console.error("Failed to get playlist:", err));
  };

  // 当前进度百分比
  const progress =
    mediaDuration && mediaDuration > 0
      ? ((isDragging ? dragValue : mediaCursor || 0) / mediaDuration) * 100
      : 0;

  // 判断播放状态用于按钮显示
  const isPlaying = mediaState === "OBS_MEDIA_STATE_PLAYING";

  return (
    <div className="media-control-panel">
      {/* 媒体文件名（过长时滚动显示） */}
      {mediaFileName && (
        <div className="media-filename-wrapper" title={mediaFileName}>
          <div
            className={`media-filename-scroll${mediaFileName.length > 30 ? " media-filename-scroll--marquee" : ""}`}
          >
            🎵 {mediaFileName}
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="media-buttons-row">
        {/* 上一曲（仅VLC显示） */}
        {isVlcSource(inputKind) && (
          <button
            className="media-btn"
            onClick={() =>
              triggerAction("OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PREVIOUS")
            }
            title="Previous"
          >
            ⏮
          </button>
        )}

        {/* 播放/暂停 */}
        <button
          className="media-btn"
          onClick={() =>
            triggerAction(
              isPlaying
                ? "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE"
                : "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
            )
          }
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* 停止 */}
        <button
          className="media-btn"
          onClick={() => triggerAction("OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP")}
          title="Stop"
        >
          ⏹
        </button>

        {/* 重置 */}
        <button
          className="media-btn"
          onClick={() =>
            triggerAction("OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART")
          }
          title="Restart"
        >
          🔄
        </button>

        {/* 下一曲（仅VLC显示） */}
        {isVlcSource(inputKind) && (
          <button
            className="media-btn"
            onClick={() =>
              triggerAction("OBS_WEBSOCKET_MEDIA_INPUT_ACTION_NEXT")
            }
            title="Next"
          >
            ⏭
          </button>
        )}

        {/* VLC播放列表按钮 */}
        {isVlcSource(inputKind) && (
          <button
            className="media-btn media-playlist-btn"
            onClick={handleShowPlaylist}
            title="View Playlist"
          >
            📋 Playlist
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="media-progress-wrapper">
        <input
          type="range"
          title="Media progress"
          className="media-progress-input"
          min={0}
          max={mediaDuration || 100}
          value={isDragging ? dragValue : mediaCursor || 0}
          onChange={(e) => {
            setIsDragging(true);
            setDragValue(Number(e.target.value));
          }}
          onMouseUp={(e) =>
            handleSeek(Number((e.target as HTMLInputElement).value))
          }
          onTouchEnd={(e) =>
            handleSeek(Number((e.target as HTMLInputElement).value))
          }
        />
      </div>

      {/* 时间显示 */}
      <div className="media-time-row">
        {/* 当前播放时间（可点击编辑） */}
        <span>
          {editingTime ? (
            <input
              type="text"
              className="media-time-input"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTimeSubmit();
                if (e.key === "Escape") setEditingTime(false);
              }}
              onBlur={handleTimeSubmit}
              autoFocus
              placeholder="00:00:00"
              title="Timestamp (HH:MM:SS)"
            />
          ) : (
            <span
              onClick={() => {
                setEditingTime(true);
                setTimeInput(formatTime(mediaCursor));
              }}
              className="media-time-clickable"
              title="Click to input timestamp (HH:MM:SS)"
            >
              {formatTime(mediaCursor)}
            </span>
          )}
        </span>
        {/* 总时间 */}
        <span>{formatTime(mediaDuration)}</span>
      </div>

      {/* VLC播放列表弹窗 */}
      {showPlaylist && (
        <PlaylistDialog
          playlist={playlist}
          onClose={() => setShowPlaylist(false)}
          onPlayItem={(idx) => {
            // 通过SetInputSettings切换VLC播放列表中的指定项
            // 先更新playlist的selected状态，然后用triggerAction切到对应项
            // OBS VLC的方式：先设置playlist index，再重新播放
            // 实际上VLC需要通过多次Next/Previous来跳转，更好的方法是:
            // 1. 获取当前播放索引 2. 计算差值 3. 发送对应次数的Next/Previous
            // 但最简单可靠的方式是通过SetInputSettings设置playlist
            const newPlaylist = playlist.map((item, i) => ({
              ...item,
              selected: i === idx,
            }));
            nodecg
              .sendMessageToBundle("getInputSettings", "obs-control", {
                id: obsId,
                inputName: sourceName,
              })
              .then((currentSettings: any) => {
                // 更新playlist的selected并应用
                const updatedPlaylist = (currentSettings.playlist || []).map(
                  (item: any, i: number) => ({
                    ...item,
                    selected: i === idx,
                  }),
                );
                // 通过后端SetInputSettings更新
                const obs_id = obsId;
                nodecg
                  .sendMessageToBundle("setInputSettings", "obs-control", {
                    id: obs_id,
                    inputName: sourceName,
                    settings: { playlist: updatedPlaylist },
                  })
                  .then(() => {
                    // 更新本地状态
                    setPlaylist(newPlaylist);
                    // 刷新文件名
                    fetchFileName();
                  })
                  .catch((err: any) =>
                    console.error("Failed to set playlist item:", err),
                  );
              })
              .catch((err: any) =>
                console.error("Failed to get input settings:", err),
              );
          }}
        />
      )}
    </div>
  );
};

// ===== 单个Source项组件 =====
const SourceItem = ({
  obsId,
  sceneName,
  item,
  index,
  totalItems,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleEnabled,
  isPlaying,
}: {
  obsId: string;
  sceneName: string;
  item: OBSSceneItem;
  index: number;
  totalItems: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onToggleEnabled: (sceneItemId: number, enabled: boolean) => void;
  isPlaying?: boolean; // 是否正在播放中（由父组件传入）
}) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      className="source-item"
      style={{
        borderLeft: `3px solid ${item.sceneItemEnabled ? "#4caf50" : "#666"}`,
      }}
    >
      {/* Source基本信息行 */}
      <div className="source-item-row">
        {/* 拖拽手柄 + 红点 + 源名称 */}
        <div className="source-item-left">
          <span className="source-drag-handle">☰</span>
          {/* 播放中红点指示 */}
          {isPlaying && <span className="source-playing-dot" title="Playing" />}
          <span
            className="source-name"
            title={`${item.sourceName} (${item.inputKind || item.sourceType})`}
          >
            {item.sourceName}
          </span>
          {/* 类型标签 */}
          {item.inputKind && (
            <span className="source-kind-badge">{item.inputKind}</span>
          )}
        </div>

        {/* 可视切换按钮 - 高对比度 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(item.sceneItemId, !item.sceneItemEnabled);
          }}
          className={`source-visibility-btn ${
            item.sceneItemEnabled
              ? "source-visibility-btn--on"
              : "source-visibility-btn--off"
          }`}
          title={item.sceneItemEnabled ? "Click to hide" : "Click to show"}
        >
          {item.sceneItemEnabled ? "👁 ON" : "👁 OFF"}
        </button>
      </div>

      {/* 媒体控制面板（仅媒体源显示） */}
      {isMediaSource(item.inputKind) && (
        <MediaControlPanel
          obsId={obsId}
          sourceName={item.sourceName}
          inputKind={item.inputKind}
        />
      )}
    </div>
  );
};

// ===== 单个OBS连接控制组件 =====
const SingleObsControl = ({
  id,
  name,
  obsState,
  streamSettings,
  onStreamSettingChange,
}: {
  id: string;
  name: string;
  obsState: OBSState;
  streamSettings: any;
  onStreamSettingChange: (id: string, newSettings: any) => void;
}) => {
  const {
    connected,
    currentScene,
    scenes,
    transitions,
    currentTransition,
    isStreaming,
    streamStats,
  } = obsState;
  const [showKey, setShowKey] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // 当前展开的Scene名称（null表示全部收起）
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  // 当前选中（预览）的Scene名称，区别于currentScene（PGM活动中）
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  // 按Scene名存储的Source列表
  const [sceneItems, setSceneItems] = useState<Record<string, OBSSceneItem[]>>(
    {},
  );
  // 拖拽排序相关
  const dragIndexRef = useRef<number | null>(null);

  // 推流设置本地状态
  const [localSettings, setLocalSettings] = useState(
    streamSettings || {
      server: "",
      key: "",
      useAuth: false,
      username: "",
      password: "",
    },
  );

  useEffect(() => {
    if (streamSettings) setLocalSettings(streamSettings);
  }, [streamSettings]);

  // 点击Scene：选中预览（黄色），展开Source列表，但不直接切换PGM
  const handleSceneClick = (sceneName: string) => {
    // 如果点击已选中的Scene则取消选中
    if (selectedScene === sceneName) {
      setSelectedScene(null);
    } else {
      setSelectedScene(sceneName);
    }

    // 切换展开状态
    if (expandedScene === sceneName) {
      setExpandedScene(null); // 收起
    } else {
      setExpandedScene(sceneName);
      // 获取该Scene的Source列表
      fetchSceneItems(sceneName);
    }
  };

  // 实际切换Scene到PGM（点击Switch按钮）
  const handleSwitchScene = (sceneName: string) => {
    nodecg.sendMessageToBundle("setOBSScene", "obs-control", {
      id,
      scene: sceneName,
    });
    // 切换后清除预览选中状态
    setSelectedScene(null);
  };

  // 刷新Scene和Source列表
  const handleRefreshScenes = () => {
    // 通过重置obsStates触发Scene列表重新获取
    // 实际上需要后端重新调用GetSceneList
    nodecg
      .sendMessageToBundle("refreshOBSScenes", "obs-control", { id })
      .catch(() => {
        // 如果后端没有此消息监听器，也不影响
      });
    // 如果有展开的Scene，也刷新其Source列表
    if (expandedScene) {
      fetchSceneItems(expandedScene);
    }
  };

  // 获取场景Source列表
  // OBS GetSceneItemList 返回顺序为底层在前（index 0 = 最底层）
  // UI中我们希望上方=高优先级（高层级），所以需要反转数组
  const fetchSceneItems = (sceneName: string) => {
    nodecg
      .sendMessageToBundle("getSceneItems", "obs-control", {
        id,
        sceneName,
      })
      .then((items: OBSSceneItem[]) => {
        // 反转排序：使高层级的源显示在上方
        setSceneItems((prev) => ({
          ...prev,
          [sceneName]: [...items].reverse(),
        }));
      })
      .catch((err: any) => {
        console.error("Failed to get scene item list:", err);
      });
  };

  // 切换源可见性
  const handleToggleEnabled = (
    sceneName: string,
    sceneItemId: number,
    enabled: boolean,
  ) => {
    nodecg
      .sendMessageToBundle("setSceneItemEnabled", "obs-control", {
        id,
        sceneName,
        sceneItemId,
        enabled,
      })
      .then(() => {
        // 更新本地状态
        setSceneItems((prev) => {
          const items = prev[sceneName] || [];
          return {
            ...prev,
            [sceneName]: items.map((item) =>
              item.sceneItemId === sceneItemId
                ? { ...item, sceneItemEnabled: enabled }
                : item,
            ),
          };
        });
      })
      .catch((err: any) => console.error("Failed to toggle visibility:", err));
  };

  // 拖拽排序处理
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // 允许放置
  };

  const handleDrop = (sceneName: string, dropIndex: number) => {
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const items = sceneItems[sceneName] || [];
    if (dragIndex < 0 || dragIndex >= items.length) return;

    // 本地重排列表（UI顺序，已经是反转后的顺序）
    const newItems = [...items];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    // 更新本地状态
    setSceneItems((prev) => ({ ...prev, [sceneName]: newItems }));

    // UI显示是反转的（index 0 = 最高层），OBS API期望底层优先的index
    // 换算：obsIndex = (len - 1) - uiIndex
    const len = items.length;
    const obsDropIndex = len - 1 - dropIndex;

    nodecg
      .sendMessageToBundle("setSceneItemIndex", "obs-control", {
        id,
        sceneName,
        sceneItemId: draggedItem.sceneItemId,
        newIndex: obsDropIndex,
      })
      .then(() => {
        // 重排后刷新完整列表
        fetchSceneItems(sceneName);
      })
      .catch((err: any) => {
        console.error("Failed to adjust order:", err);
        // 失败回滚
        fetchSceneItems(sceneName);
      });

    dragIndexRef.current = null;
  };

  const handleTransitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    nodecg.sendMessageToBundle("setOBSTransition", "obs-control", {
      id,
      transition: e.target.value,
    });
  };

  const handleLocalSettingChange = (field: string, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    onStreamSettingChange(id, newSettings);
  };

  const toggleStreaming = () => {
    if (isStreaming) {
      nodecg.sendMessageToBundle("stopStreaming", "obs-control", { id });
    } else {
      nodecg
        .sendMessageToBundle("setStreamSettings", "obs-control", {
          id,
          settings: localSettings,
        })
        .then(() =>
          nodecg.sendMessageToBundle("startStreaming", "obs-control", { id }),
        )
        .catch((err: any) =>
          console.error(`[${name}] Failed to start stream`, err),
        );
    }
  };

  if (!connected) {
    return (
      <div className="obs-disconnected">
        <strong>{name}</strong>: Disconnected
      </div>
    );
  }

  return (
    <div
      className={`obs-control-card ${
        isStreaming ? "obs-control-card--streaming" : "obs-control-card--idle"
      }`}
    >
      <h3 className="obs-card-title">{name}</h3>

      <div className="obs-current-scene">
        <p>
          Current Scene: <strong>{currentScene}</strong>
        </p>
      </div>

      {/* Transitions */}
      <div className="obs-transition-group">
        <label className="obs-label-block">Transition:</label>
        <select
          title="Select transition"
          value={currentTransition || ""}
          onChange={handleTransitionChange}
          className="obs-select-full"
        >
          {(transitions || []).map((t: string) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Stream Control */}
      <div className="obs-stream-settings">
        <h4 className="obs-stream-settings-title">Destination</h4>
        <div className="obs-field-group">
          <label className="obs-field-label">Server</label>
          <input
            type="text"
            title="Stream server URL"
            placeholder="rtmp://..."
            value={localSettings.server}
            onChange={(e) => handleLocalSettingChange("server", e.target.value)}
            disabled={isStreaming}
            className="obs-text-input"
          />
        </div>
        <div className="obs-field-group obs-field-row--gap">
          <label className="obs-field-label">Stream Key</label>
          <div className="obs-field-row">
            <input
              type={showKey ? "text" : "password"}
              title="Stream key"
              placeholder="Stream key"
              value={localSettings.key}
              onChange={(e) => handleLocalSettingChange("key", e.target.value)}
              disabled={isStreaming}
              className="obs-text-input--flex"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="obs-show-hide-btn"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="obs-field-group">
          <label>
            <input
              type="checkbox"
              checked={localSettings.useAuth}
              onChange={(e) =>
                handleLocalSettingChange("useAuth", e.target.checked)
              }
              disabled={isStreaming}
            />{" "}
            Use authentication
          </label>
        </div>
        {localSettings.useAuth && (
          <>
            <div className="obs-field-group">
              <label className="obs-field-label">Username</label>
              <input
                type="text"
                title="Username"
                placeholder="Username"
                value={localSettings.username}
                onChange={(e) =>
                  handleLocalSettingChange("username", e.target.value)
                }
                disabled={isStreaming}
                className="obs-text-input"
              />
            </div>
            <div className="obs-field-group">
              <label className="obs-field-label">Password</label>
              <div className="obs-field-row">
                <input
                  type={showPass ? "text" : "password"}
                  title="Password"
                  placeholder="Password"
                  value={localSettings.password}
                  onChange={(e) =>
                    handleLocalSettingChange("password", e.target.value)
                  }
                  disabled={isStreaming}
                  className="obs-text-input--flex"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="obs-show-hide-btn"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </>
        )}
        <div className="obs-stream-actions">
          <button
            onClick={toggleStreaming}
            className={`obs-stream-btn ${
              isStreaming ? "obs-stream-btn--stop" : "obs-stream-btn--start"
            }`}
          >
            {isStreaming ? "Stop Streaming" : "Start Streaming"}
          </button>
          {isStreaming && streamStats && (
            <div className="obs-stream-stats">
              <div>Time: {streamStats.outputTimecode || "00:00:00"}</div>
              {streamStats.kbitsPerSec > 0 && (
                <div>Bitrate: {streamStats.kbitsPerSec} kbps</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scenes - 可点击展开Source列表 */}
      <div className="obs-scenes-header">
        <h4 className="obs-scenes-title">Scenes</h4>
        <button
          onClick={handleRefreshScenes}
          className="obs-refresh-btn"
          title="Refresh Scene and Source List"
        >
          🔄 Refresh
        </button>
      </div>
      <ul className="obs-scenes-list">
        {(scenes || []).map((scene: OBSScene) => {
          const isExpanded = expandedScene === scene.name;
          const isActive = currentScene === scene.name; // 当前PGM活动Scene
          const isSelected = selectedScene === scene.name; // 用户选中预览的Scene
          const items = sceneItems[scene.name] || [];

          // 确定Scene背景颜色：红色=活动中PGM，黄色=预览选中，灰色=普通
          let sceneBgColor = "#424242";
          if (isActive) {
            sceneBgColor = "#c62828"; // 红色 - 活动中PGM
          } else if (isSelected) {
            sceneBgColor = "#f9a825"; // 黄色 - 预览选中
          }

          return (
            <li key={scene.name} className="obs-scene-item">
              {/* Scene按钮 */}
              <div
                onClick={() => handleSceneClick(scene.name)}
                className={`obs-scene-btn ${
                  isExpanded ? "obs-scene-btn--expanded" : ""
                }`}
                style={{ backgroundColor: sceneBgColor }}
              >
                <div className="obs-scene-btn-left">
                  <span
                    className={
                      isActive || isSelected
                        ? "obs-scene-name--active"
                        : "obs-scene-name--normal"
                    }
                  >
                    {scene.name}
                  </span>
                  {isActive && <span className="obs-pgm-badge">PGM</span>}
                  {/* Switch按钮 - 仅在预览选中（非活动）时显示 */}
                  {isSelected && !isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchScene(scene.name);
                      }}
                      className="obs-switch-btn"
                      title="切换此Scene到PGM"
                    >
                      SWITCH
                    </button>
                  )}
                </div>
                <span
                  className={`obs-scene-arrow ${
                    isActive || isSelected
                      ? "obs-scene-arrow--active"
                      : "obs-scene-arrow--normal"
                  } ${isExpanded ? "obs-scene-arrow--expanded" : ""}`}
                >
                  ▼
                </span>
              </div>

              {/* 展开的Source列表 */}
              {isExpanded && (
                <div className="obs-source-list-container">
                  {items.length === 0 ? (
                    <div className="obs-source-list-loading">Loading...</div>
                  ) : (
                    items.map((item, idx) => (
                      <SourceItem
                        key={item.sceneItemId}
                        obsId={id}
                        sceneName={scene.name}
                        item={item}
                        index={idx}
                        totalItems={items.length}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={(dropIdx) => handleDrop(scene.name, dropIdx)}
                        onToggleEnabled={(sceneItemId, enabled) =>
                          handleToggleEnabled(scene.name, sceneItemId, enabled)
                        }
                        isPlaying={
                          isMediaSource(item.inputKind) && item.sceneItemEnabled
                        }
                      />
                    ))
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ===== 主面板组件 =====
const ObsControlPanel = () => {
  const [connections, setConnections] = useState<OBSConnectionSettings[]>([]);
  const [obsStates, setObsStates] = useState<Record<string, OBSState>>({});
  const [allStreamSettings, setAllStreamSettings] = useState<
    Record<string, any>
  >({});

  useEffect(() => {
    const obsConnectionsRep = nodecg.Replicant<OBSConnectionSettings[]>(
      "obsConnections",
      { defaultValue: [] },
    );
    const obsStatesRep = nodecg.Replicant<Record<string, OBSState>>(
      "obsStates",
      { defaultValue: {} },
    );
    const streamSettingsRep = nodecg.Replicant<Record<string, any>>(
      "obsStreamSettings",
      { defaultValue: {} },
    );

    obsConnectionsRep.on("change", (newVal: OBSConnectionSettings[]) => {
      if (newVal) setConnections(JSON.parse(JSON.stringify(newVal)));
    });
    obsStatesRep.on("change", (newVal: Record<string, OBSState>) => {
      if (newVal) setObsStates(JSON.parse(JSON.stringify(newVal)));
    });
    streamSettingsRep.on("change", (newVal: Record<string, any>) => {
      if (newVal) setAllStreamSettings(JSON.parse(JSON.stringify(newVal)));
    });
  }, []);

  const handleStreamSettingChange = (id: string, newSettings: any) => {
    const newAllSettings = { ...allStreamSettings, [id]: newSettings };
    setAllStreamSettings(newAllSettings);
    nodecg.Replicant<Record<string, any>>("obsStreamSettings", {
      defaultValue: {},
    }).value = newAllSettings;
  };

  return (
    <div className="obs-panel-root">
      <h2>OBS Controls</h2>
      {connections.length === 0 && <p>No OBS connections configured.</p>}

      {connections.map((conn) => (
        <SingleObsControl
          key={conn.id}
          id={conn.id}
          name={conn.name || "Unknown OBS"}
          obsState={obsStates[conn.id] || { connected: false }}
          streamSettings={allStreamSettings[conn.id]}
          onStreamSettingChange={handleStreamSettingChange}
        />
      ))}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<ObsControlPanel />);
