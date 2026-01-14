# PowerShell script to add HowLongToBeat data to remaining game pages

$games = @(
    @{file="2025-march-kirby-64.html"; main="3½ hours"; extras="4½ hours"; complete="7 hours"; url="https://howlongtobeat.com/game/5064"},
    @{file="2025-april-billy-hatcher.html"; main="8 hours"; extras="10 hours"; complete="24 hours"; url="https://howlongtobeat.com/game/1291"},
    @{file="2025-may-snatcher.html"; main="6½ hours"; extras="7 hours"; complete="8 hours"; url="https://howlongtobeat.com/game/8817"},
    @{file="2025-july-resident-evil-2.html"; main="8½ hours"; extras="12 hours"; complete="15 hours"; url="https://howlongtobeat.com/game/7719"},
    @{file="2025-august-umihara-kawase.html"; main="2 hours"; extras="3½ hours"; complete="7 hours"; url="https://howlongtobeat.com/game/10266"},
    @{file="2025-september-gran-turismo-2.html"; main="29 hours"; extras="50 hours"; complete="104 hours"; url="https://howlongtobeat.com/game/3973"},
    @{file="2025-october-koudelka.html"; main="12 hours"; extras="13½ hours"; complete="17 hours"; url="https://howlongtobeat.com/game/5127"},
    @{file="2025-november-brave-fencer-musashi.html"; main="11½ hours"; extras="14 hours"; complete="20 hours"; url="https://howlongtobeat.com/game/1293"},
    @{file="2025-december-nights.html"; main="3 hours"; extras="5 hours"; complete="10 hours"; url="https://howlongtobeat.com/game/6667"},
    @{file="2026-january-mega-man-legends.html"; main="9 hours"; extras="11 hours"; complete="14 hours"; url="https://howlongtobeat.com/game/6131"}
)

$hltbSection = @"

        <div class="game-stats">
          <h3>How Long to Beat</h3>
          <table>
            <tr>
              <th>Main Story</th>
              <th>Main + Extras</th>
              <th>Completionist</th>
            </tr>
            <tr>
              <td>{MAIN}</td>
              <td>{EXTRAS}</td>
              <td>{COMPLETE}</td>
            </tr>
          </table>
          <p class="stats-source"><a href="{URL}" target="_blank">View on HowLongToBeat →</a></p>
        </div>
"@

foreach ($game in $games) {
    $filePath = $game.file
    Write-Host "Processing $filePath..." -ForegroundColor Cyan

    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw

        # Create the HLTB section for this game
        $gameSection = $hltbSection -replace '{MAIN}', $game.main `
                                     -replace '{EXTRAS}', $game.extras `
                                     -replace '{COMPLETE}', $game.complete `
                                     -replace '{URL}', $game.url

        # Insert before the "Back to home" link
        $pattern = '(\s*)<p><a href="index\.html">Back to home</a></p>'
        $replacement = $gameSection + '$1<p><a href="index.html">Back to home</a></p>'

        $newContent = $content -replace $pattern, $replacement

        if ($newContent -ne $content) {
            Set-Content -Path $filePath -Value $newContent -NoNewline
            Write-Host "✓ Updated $filePath" -ForegroundColor Green
        } else {
            Write-Host "⚠ No changes made to $filePath (pattern not found)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "`nDone! All files have been processed." -ForegroundColor Green
