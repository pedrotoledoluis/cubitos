@echo off
rem CLI for the Cubitos publisher. Uses the published exe when present, otherwise dotnet run.
setlocal
set "EXE=%~dp0dist\worker\Cubitos.Publisher.Worker.exe"
set "ARGS=%*"
if "%~1"=="" set "ARGS=help"
if exist "%EXE%" (
  "%EXE%" %ARGS%
) else (
  dotnet run --project "%~dp0src\Cubitos.Publisher.Worker" -- %ARGS%
)
exit /b %ERRORLEVEL%
