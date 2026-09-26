Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Determine base project directory
strScriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strAppDir = objFSO.GetParentFolderName(strScriptDir)

strTarget = ""
If WScript.Arguments.Count > 0 Then
    strTarget = " """ & WScript.Arguments(0) & """"
End If

' Launch Electron silently without popping up a command prompt window (0 = hidden)
objShell.CurrentDirectory = strAppDir
objShell.Run "cmd /c npm run electron --" & strTarget, 0, False
