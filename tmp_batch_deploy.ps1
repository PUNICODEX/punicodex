$sites = Get-ChildItem sites | Where-Object { $_.PSIsContainer -and (Test-Path (Join-Path $_.FullName "index.html")) }
$total = $sites.Count
$i = 0
foreach ($site in $sites) {
    $i++
    Write-Host "[$i/$total] Deploying $($site.Name)..."
    Set-Location $site.FullName
    $output = vercel --yes --prod 2>&1
    Set-Location $PSScriptRoot
    if ($output -match "Success") {
        Write-Host "  ✅ $($site.Name) deployed"
    } else {
        Write-Host "  ⚠️ $($site.Name) issue: $output"
    }
}
Write-Host "Done!"
