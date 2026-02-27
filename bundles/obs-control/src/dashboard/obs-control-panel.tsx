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
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#2b2b2b",
          border: "1px solid #555",
          borderRadius: "8px",
          padding: "15px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "60vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            borderBottom: "1px solid #444",
            paddingBottom: "8px",
          }}
        >
          <h4 style={{ margin: 0 }}>📋 Playlist</h4>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#aaa",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        {playlist.length === 0 ? (
          <p style={{ color: "#888" }}>Playlist is empty</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {playlist.map((item, idx) => (
              <li
                key={idx}
                style={{
                  padding: "6px 8px",
                  marginBottom: "2px",
                  backgroundColor: item.selected ? "#3a5a3a" : "transparent",
                  borderRadius: "3px",
                  fontSize: "0.85em",
                  color: item.hidden ? "#666" : "#ddd",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {/* 播放按钮 */}
                <button
                  onClick={() => onPlayItem(idx)}
                  style={{
                    background: item.selected ? "#4caf50" : "#505050",
                    border: "1px solid " + (item.selected ? "#66bb6a" : "#666"),
                    borderRadius: "3px",
                    color: "white",
                    cursor: "pointer",
                    padding: "2px 6px",
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                  title={`Play: ${getFileName(item.value)}`}
                >
                  ▶
                </button>
                <span style={{ color: "#888", flexShrink: 0 }}>{idx + 1}.</span>
                <span style={{ wordBreak: "break-all", flex: 1 }}>
                  {getFileName(item.value)}
                </span>
                {item.selected && (
                  <span style={{ color: "#4caf50", flexShrink: 0 }}>🔊</span>
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

  // 按钮通用样式
  const btnStyle: React.CSSProperties = {
    padding: "4px 8px",
    backgroundColor: "#505050",
    color: "white",
    border: "1px solid #666",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "14px",
    minWidth: "30px",
  };

  return (
    <div
      style={{
        marginTop: "6px",
        padding: "8px",
        backgroundColor: "#1e1e1e",
        borderRadius: "4px",
        border: "1px solid #3a3a3a",
      }}
    >
      {/* 媒体文件名（过长时滚动显示） */}
      {mediaFileName && (
        <div
          style={{
            fontSize: "0.8em",
            color: "#aaa",
            marginBottom: "6px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            position: "relative",
          }}
          title={mediaFileName}
        >
          <div
            style={{
              display: "inline-block",
              animation:
                mediaFileName.length > 30
                  ? "marquee 10s linear infinite"
                  : "none",
              paddingLeft: mediaFileName.length > 30 ? "100%" : "0",
            }}
          >
            🎵 {mediaFileName}
          </div>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100%); }
            }
          `}</style>
        </div>
      )}

      {/* 控制按钮 */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "6px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* 上一曲（仅VLC显示） */}
        {isVlcSource(inputKind) && (
          <button
            style={btnStyle}
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
          style={btnStyle}
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
          style={btnStyle}
          onClick={() => triggerAction("OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP")}
          title="Stop"
        >
          ⏹
        </button>

        {/* 重置 */}
        <button
          style={btnStyle}
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
            style={btnStyle}
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
            style={{
              ...btnStyle,
              marginLeft: "auto",
              fontSize: "0.75em",
              padding: "3px 6px",
            }}
            onClick={handleShowPlaylist}
            title="View Playlist"
          >
            📋 Playlist
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div style={{ marginBottom: "4px" }}>
        <input
          type="range"
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
          style={{
            width: "100%",
            height: "6px",
            cursor: "pointer",
            accentColor: "#4caf50",
          }}
        />
      </div>

      {/* 时间显示 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.75em",
          color: "#999",
        }}
      >
        {/* 当前播放时间（可点击编辑） */}
        <span>
          {editingTime ? (
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTimeSubmit();
                if (e.key === "Escape") setEditingTime(false);
              }}
              onBlur={handleTimeSubmit}
              autoFocus
              placeholder="00:00:00"
              style={{
                width: "70px",
                padding: "1px 3px",
                backgroundColor: "#333",
                color: "#fff",
                border: "1px solid #666",
                borderRadius: "2px",
                fontSize: "inherit",
              }}
            />
          ) : (
            <span
              onClick={() => {
                setEditingTime(true);
                setTimeInput(formatTime(mediaCursor));
              }}
              style={{ cursor: "pointer", borderBottom: "1px dashed #666" }}
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
      style={{
        padding: "6px 8px",
        backgroundColor: "#383838",
        marginBottom: "2px",
        borderRadius: "3px",
        cursor: "grab",
        borderLeft: `3px solid ${item.sceneItemEnabled ? "#4caf50" : "#666"}`,
      }}
    >
      {/* Source基本信息行 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* 拖拽手柄 + 红点 + 源名称 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span style={{ color: "#666", cursor: "grab", fontSize: "12px" }}>
            ☰
          </span>
          {/* 播放中红点指示 */}
          {isPlaying && (
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#f44336",
                boxShadow: "0 0 4px rgba(244,67,54,0.6)",
                flexShrink: 0,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
              title="Playing"
            />
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "0.85em",
            }}
            title={`${item.sourceName} (${item.inputKind || item.sourceType})`}
          >
            {item.sourceName}
          </span>
          {/* 类型标签 */}
          {item.inputKind && (
            <span
              style={{
                fontSize: "0.65em",
                color: "#888",
                backgroundColor: "#2a2a2a",
                padding: "1px 4px",
                borderRadius: "2px",
                flexShrink: 0,
              }}
            >
              {item.inputKind}
            </span>
          )}
        </div>

        {/* 可视切换按钮 - 高对比度 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(item.sceneItemId, !item.sceneItemEnabled);
          }}
          style={{
            backgroundColor: item.sceneItemEnabled ? "#2e7d32" : "#616161",
            border: `2px solid ${item.sceneItemEnabled ? "#4caf50" : "#999"}`,
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            padding: "3px 8px",
            color: "white",
            flexShrink: 0,
            transition: "all 0.15s ease",
            boxShadow: item.sceneItemEnabled
              ? "0 0 6px rgba(76,175,80,0.4)"
              : "0 1px 2px rgba(0,0,0,0.3)",
          }}
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

    // 本地重排列表
    const newItems = [...items];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    // 更新本地状态
    setSceneItems((prev) => ({ ...prev, [sceneName]: newItems }));

    // 发送到后端（使用目标位置的sceneItemIndex）
    const targetItem = items[dropIndex];
    nodecg
      .sendMessageToBundle("setSceneItemIndex", "obs-control", {
        id,
        sceneName,
        sceneItemId: draggedItem.sceneItemId,
        newIndex: dropIndex,
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
      <div
        style={{
          padding: "10px",
          margin: "10px 0",
          border: "1px dashed #555",
          borderRadius: "5px",
          color: "#aaa",
        }}
      >
        <strong>{name}</strong>: Disconnected
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: "20px",
        border: isStreaming ? "2px solid #f44336" : "1px solid #444",
        borderRadius: "5px",
        padding: "10px",
        backgroundColor: "#2b2b2b",
        boxShadow: isStreaming ? "0 0 10px rgba(244,67,54,0.3)" : "none",
        transition: "border 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          borderBottom: "1px solid #444",
          paddingBottom: "5px",
        }}
      >
        {name}
      </h3>

      <div style={{ marginBottom: "15px" }}>
        <p>
          Current Scene: <strong>{currentScene}</strong>
        </p>
      </div>

      {/* Transitions */}
      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Transition:
        </label>
        <select
          value={currentTransition || ""}
          onChange={handleTransitionChange}
          style={{
            width: "100%",
            padding: "5px",
            backgroundColor: "#424242",
            color: "white",
            border: "1px solid #555",
          }}
        >
          {(transitions || []).map((t: string) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Stream Control */}
      <div
        style={{
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#333",
          borderRadius: "5px",
        }}
      >
        <h4 style={{ marginTop: 0 }}>Destination</h4>
        <div style={{ marginBottom: "5px" }}>
          <label style={{ display: "block" }}>Server</label>
          <input
            type="text"
            value={localSettings.server}
            onChange={(e) => handleLocalSettingChange("server", e.target.value)}
            disabled={isStreaming}
            style={{
              width: "100%",
              padding: "5px",
              backgroundColor: "#222",
              color: "#fff",
              border: "1px solid #444",
              opacity: isStreaming ? 0.5 : 1,
            }}
          />
        </div>
        <div style={{ marginBottom: "5px", position: "relative" }}>
          <label style={{ display: "block" }}>Stream Key</label>
          <div style={{ display: "flex" }}>
            <input
              type={showKey ? "text" : "password"}
              value={localSettings.key}
              onChange={(e) => handleLocalSettingChange("key", e.target.value)}
              disabled={isStreaming}
              style={{
                flex: 1,
                padding: "5px",
                backgroundColor: "#222",
                color: "#fff",
                border: "1px solid #444",
                opacity: isStreaming ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{ marginLeft: "5px" }}
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: "5px" }}>
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
            <div style={{ marginBottom: "5px" }}>
              <label style={{ display: "block" }}>Username</label>
              <input
                type="text"
                value={localSettings.username}
                onChange={(e) =>
                  handleLocalSettingChange("username", e.target.value)
                }
                disabled={isStreaming}
                style={{
                  width: "100%",
                  padding: "5px",
                  backgroundColor: "#222",
                  color: "#fff",
                  border: "1px solid #444",
                  opacity: isStreaming ? 0.5 : 1,
                }}
              />
            </div>
            <div style={{ marginBottom: "5px" }}>
              <label style={{ display: "block" }}>Password</label>
              <div style={{ display: "flex" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={localSettings.password}
                  onChange={(e) =>
                    handleLocalSettingChange("password", e.target.value)
                  }
                  disabled={isStreaming}
                  style={{
                    flex: 1,
                    padding: "5px",
                    backgroundColor: "#222",
                    color: "#fff",
                    border: "1px solid #444",
                    opacity: isStreaming ? 0.5 : 1,
                  }}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  style={{ marginLeft: "5px" }}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </>
        )}
        <div
          style={{
            marginTop: "15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={toggleStreaming}
            style={{
              padding: "10px 20px",
              backgroundColor: isStreaming ? "#d32f2f" : "#388e3c",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isStreaming ? "Stop Streaming" : "Start Streaming"}
          </button>
          {isStreaming && streamStats && (
            <div style={{ textAlign: "right", fontSize: "0.9em" }}>
              <div>Time: {streamStats.outputTimecode || "00:00:00"}</div>
              {streamStats.kbitsPerSec > 0 && (
                <div>Bitrate: {streamStats.kbitsPerSec} kbps</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scenes - 可点击展开Source列表 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <h4 style={{ margin: 0 }}>Scenes</h4>
        <button
          onClick={handleRefreshScenes}
          style={{
            background: "#505050",
            border: "1px solid #666",
            borderRadius: "3px",
            color: "white",
            cursor: "pointer",
            padding: "2px 8px",
            fontSize: "12px",
          }}
          title="Refresh Scene and Source List"
        >
          🔄 Refresh
        </button>
      </div>
      {/* 红点脉冲动画CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <ul style={{ listStyle: "none", padding: 0 }}>
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
            <li key={scene.name} style={{ marginBottom: "4px" }}>
              {/* Scene按钮 */}
              <div
                onClick={() => handleSceneClick(scene.name)}
                style={{
                  padding: "8px",
                  backgroundColor: sceneBgColor,
                  borderRadius: isExpanded ? "4px 4px 0 0" : "4px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background-color 0.2s ease",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{ color: isActive || isSelected ? "#fff" : "#ddd" }}
                  >
                    {scene.name}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: "0.65em",
                        backgroundColor: "rgba(0,0,0,0.3)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        color: "#fff",
                      }}
                    >
                      PGM
                    </span>
                  )}
                  {/* Switch按钮 - 仅在预览选中（非活动）时显示 */}
                  {isSelected && !isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchScene(scene.name);
                      }}
                      style={{
                        backgroundColor: "#d32f2f",
                        border: "1px solid #ef5350",
                        borderRadius: "3px",
                        color: "white",
                        cursor: "pointer",
                        padding: "2px 10px",
                        fontSize: "0.75em",
                        fontWeight: "bold",
                      }}
                      title="切换此Scene到PGM"
                    >
                      SWITCH
                    </button>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.7em",
                    color: isActive || isSelected ? "#fff" : "#aaa",
                    transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  ▼
                </span>
              </div>

              {/* 展开的Source列表 */}
              {isExpanded && (
                <div
                  style={{
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #444",
                    borderTop: "none",
                    borderRadius: "0 0 4px 4px",
                    padding: "6px",
                  }}
                >
                  {items.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#666",
                        padding: "8px",
                        fontSize: "0.85em",
                      }}
                    >
                      Loading...
                    </div>
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
    <div style={{ padding: "10px" }}>
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
