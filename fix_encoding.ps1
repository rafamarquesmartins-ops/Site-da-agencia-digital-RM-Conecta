$files = @('index.html', 'sites.html', 'servicos.html', 'portfolio.html', 'sobre.html', 'contactos.html', 'faq.html')

$replacements = @{
    'Ã¡' = 'á'
    'Ã ' = 'à'
    'Ã¢' = 'â'
    'Ã£' = 'ã'
    'Ã§' = 'ç'
    'Ã©' = 'é'
    'Ãª' = 'ê'
    'Ã­' = 'í'
    'Ã³' = 'ó'
    'Ã´' = 'ô'
    'Ãµ' = 'õ'
    'Ãº' = 'ú'
    'Ã ' = 'Á'
    'Ã€' = 'À'
    'Ã‚' = 'Â'
    'Ãƒ' = 'Ã'
    'Ã‡' = 'Ç'
    'Ã‰' = 'É'
    'ÃŠ' = 'Ê'
    'Ã ' = 'Í'
    'Ã“' = 'Ó'
    'Ã”' = 'Ô'
    'Ã•' = 'Õ'
    'Ãš' = 'Ú'
    'Âº' = 'º'
    'Âª' = 'ª'
    'â‚¬' = '€'
    'â€“' = '–'
    'â€”' = '—'
    'â€™' = '’'
    'â€œ' = '“'
    'â€ ' = '”'
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = [System.IO.File]::ReadAllText("$pwd\$file", $utf8NoBom)
        
        foreach ($key in $replacements.Keys) {
            $content = $content.Replace($key, $replacements[$key])
        }
        
        [System.IO.File]::WriteAllText("$pwd\$file", $content, $utf8NoBom)
        Write-Host "Fixed $file"
    }
}
