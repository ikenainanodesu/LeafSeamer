读取`E:\GitHub repository\LeafSeamer\projectdocuments\needs.md`文件后帮我梳理一下技术栈:

1.  考虑到未来的扩展性,需要将包括但不限于驱动在内的各个功能模块化.
2.  各个值可以单独被调用,以便于后续功能扩展.
3.  本地部分异步处理,加入时间戳.
4.  给出文件结构树状图.
5.  给出 mermaid 流程图.
6.  将之后的所有回答全部输出为 markdown 格式的代码,保存到`E:\GitHub repository\LeafSeamer\projectdocuments`文件夹中方便调取,备忘存档,跟随项目进行实时更新.
7.  使用 nodecg 相关技术时先查询再编写.


如果再次遇到 NodeCG 进程未关闭（端口被占用）的情况，你有两种方法可以关闭它：

方法 1：使用我为你创建的脚本（推荐）
我刚才为你创建了一个方便的脚本，你只需要在终端运行：

powershell
.\scripts\kill-nodecg.ps1
这个脚本会自动查找占用 9090 端口的进程并将其强制关闭。

方法 2：手动运行命令
你也可以直接在 PowerShell 中运行以下命令：

powershell
Get-NetTCPConnection -LocalPort 9090 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
我已经将这些信息更新到了项目的 
TROUBLESHOOTING.md
 文件中，方便你随时查阅。