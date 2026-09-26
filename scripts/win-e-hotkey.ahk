; AutoHotkey script to redirect Win + E to MyFiles
; To run on Windows startup, place this script or a shortcut to it in:
; shell:startup (Press Win+R, type 'shell:startup', and hit Enter)

#NoEnv
#SingleInstance force
SendMode Input
SetWorkingDir %A_ScriptDir%

; Remap Win + E (Windows Key + E) to MyFiles silent launcher
#e::
    Run, wscript.exe "%A_ScriptDir%\launch.vbs", , Hide
return
