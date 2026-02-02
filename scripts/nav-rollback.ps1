# Restores the legacy duplicated nav (desktop + mobile) markup.
$pattern = "<input type=\"checkbox\" id=\"nav-toggle\" class=\"nav-toggle\" />\s*<label[^>]*class=\"main-nav-summary\"[^>]*>[\s\S]*?<\/label>\s*<nav class=\"main-nav\" aria-label=\"Primary\">([\s\S]*?)<\/nav>"
$replacement = "<nav class=\"main-nav main-nav-desktop\" aria-label=\"Primary\">`$1</nav>`r`n        <details class=\"main-nav-details\">`r`n          <summary class=\"main-nav-summary\">`r`n            <span class=\"main-nav-summary-label\">Menu</span>`r`n            <span class=\"main-nav-summary-icon\">v</span>`r`n          </summary>`r`n          <nav class=\"main-nav main-nav-mobile\" aria-label=\"Primary\">`$1</nav>`r`n        </details>`r`n"

Get-ChildItem -Recurse -Filter *.html | ForEach-Object {
  $p = $_.FullName
  $c = Get-Content -Raw $p
  if ($c -match $pattern) {
    $u = [regex]::Replace($c, $pattern, $replacement, 'Singleline')
    if ($u -ne $c) { Set-Content -Path $p -Value $u }
  }
}
