!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to MyFiles Setup"
  !define MUI_WELCOMEPAGE_TEXT "Setup will guide you through installing MyFiles.$\r$\n$\r$\nMyFiles brings keyboard-first navigation, Quick Look previews, Miller columns, and a modern glass desktop experience to Windows.$\r$\n$\r$\nClick Next to choose your install location."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customInit
  # Preserve taskbar pinned shortcut across installer updates
  ${If} ${FileExists} "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\MyFiles.lnk"
    CopyFiles /SILENT "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\MyFiles.lnk" "$TEMP\MyFiles_Taskbar_Backup.lnk"
  ${EndIf}
!macroend

!macro customInstall
  # Restore pinned taskbar shortcut after installation completes
  ${If} ${FileExists} "$TEMP\MyFiles_Taskbar_Backup.lnk"
    CreateDirectory "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
    CopyFiles /SILENT "$TEMP\MyFiles_Taskbar_Backup.lnk" "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\MyFiles.lnk"
    Delete "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Tombstones\MyFiles.lnk"
    Delete "$TEMP\MyFiles_Taskbar_Backup.lnk"
    System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x0000, i 0, i 0)'
  ${EndIf}
!macroend
