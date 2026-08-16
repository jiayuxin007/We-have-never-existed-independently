@echo off
REM 将 AE 导出的透明 MOV 转为 Chrome 可播 WebM（VP9 + Alpha）
REM 用法：把 .mov 拖进本脚本，或在 logo 目录双击运行
REM 画质：CRF 20（越小越清晰，18-24 可调；旧版 crf 32 体积更小但更糊）

setlocal
cd /d "%~dp0"

set "CRF=20"

where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 ffmpeg。请先安装： winget install Gyan.FFmpeg
    exit /b 1
)

if "%~1"=="" (
    echo 正在转换当前目录下所有 .mov （CRF=%CRF%）...
    for %%F in (*.mov) do call :convert "%%F"
) else (
    call :convert "%~1"
)
echo 完成。请将生成的 .webm 保留在同目录，面板会自动优先加载。
pause
exit /b 0

:convert
set "SRC=%~1"
set "BASE=%~n1"
set "OUT=%~dp0%BASE%.webm"
echo 转换: %BASE%.mov -^> %BASE%.webm （CRF=%CRF%）
ffmpeg -y -i "%SRC%" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf %CRF% "%OUT%"
goto :eof
