
function esc(s) {
  if (s == null) return '""';
  return '"' + ('' + s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t') + '"';
}

var sh = new ActiveXObject("Shell.Application");
var bin = sh.Namespace(10);
var items = bin.Items();
var count = items.Count;
var parts = [];
for (var i = 0; i < count; i++) {
  var it = items.Item(i);
  parts.push('{' +
    '"name":' + esc(it.Name) + ',' +
    '"path":' + esc(it.Path) + ',' +
    '"size":' + (it.Size || 0) + ',' +
    '"origLoc":' + esc(bin.GetDetailsOf(it, 1)) + ',' +
    '"dateDeleted":' + esc(bin.GetDetailsOf(it, 2)) + ',' +
    '"type":' + esc(bin.GetDetailsOf(it, 4)) +
  '}');
}
WScript.Echo('[' + parts.join(',') + ']');
