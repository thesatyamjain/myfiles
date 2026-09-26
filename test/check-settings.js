const fs = require('fs');
const html = fs.readFileSync('src/index.html', 'utf8');

const ids = [
  'settingsModal', 'settingsThemeCtrl', 'settingsAccentSwatches', 'settingsStartupFolder',
  'settingsStartupCustomWrap', 'settingsStartupCustom', 'settingsOpenAction',
  'settingsSearchScope', 'settingsCheckboxes', 'settingsConfirmDelete',
  'settingsCheckAutoRefresh', 'settingsDateFormat', 'settingsDensity',
  'settingsDefaultView', 'settingsThumbSize', 'settingsCheckExtensions',
  'settingsCheckHidden', 'settingsCheckColDate', 'settingsCheckColType',
  'settingsCheckColSize', 'settingsCheckColTag', 'settingsCheckSidebarRecents',
  'settingsCheckSidebarFavorites', 'settingsCheckSidebarDrives',
  'settingsCheckSidebarTags', 'settingsTagVisibilityGrid',
  'settingsCheckQuickLook', 'settingsCheckAutoplay', 'settingsCheckLoop',
  'settingsCheckVlc', 'settingsVlcStatusBadge', 'settingsVlcStatusDesc',
  'settingsTerminalShell', 'settingsChecksumAlgo', 'settingsDefaultArchiveFormat',
  'settingsDefaultArchiveLevel', 'settingsCheckAutoOpenExtracted',
  'settingsDedupScanMode', 'settingsDedupMinSize', 'btnToolbarSettings',
  'btnTitlebarSettings', 'sidebarSettings',
  'moreActPreferences', 'ctxPreferences',
  'btnCloseSettingsModal', 'btnSettingsDone', 'settingsTabBar'
];

let missing = 0;
for (const id of ids) {
  if (!html.includes(`id="${id}"`)) {
    console.log('MISSING:', id);
    missing++;
  }
}
console.log('Missing count:', missing);
