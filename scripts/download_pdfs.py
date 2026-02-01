"""
Download PDFs via API using browser cookies.

INSTRUKTIONER:
1. Öppna webbläsaren → logga in på artikeldatabasen (Emerald, EBSCO, etc.)
2. Öppna DevTools (F12) → Network-fliken
3. Ladda ner en PDF manuellt
4. Högerklicka på PDF-requesten → Copy → Copy as cURL
5. Gå till https://curlconverter.com/ och klistra in
6. Kopiera cookies och headers därifrån till detta script
"""

import requests
import time
import json
from pathlib import Path

# ============================================================
# KOPIERA FRÅN CURLCONVERTER.COM - ERSÄTT MED DINA VÄRDEN
# ============================================================

# Cookies från din inloggade session
cookies = {
    # Exempel - ersätt med riktiga värden från cURL:
    # 'SESSION': 'abc123...',
    # 'AUTH_TOKEN': 'xyz789...',
}

# Headers från din request
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/pdf,application/octet-stream,*/*',
    # Lägg till fler headers från cURL om nödvändigt
}

# ============================================================
# KONFIGURATION
# ============================================================

# Output-mapp för PDFs
OUTPUT_DIR = Path("pdfs")

# Delay mellan requests (sekunder) - var snäll mot servern
DELAY = 1.0

# ============================================================
# DINA DOIs ELLER URLs
# ============================================================

# Alternativ 1: Lista med DOIs
dois = [
    # "10.1108/IJMPB-09-2024-0233",
    # "10.1108/IJMPB-10-2024-0241",
    # ... lägg till alla
]

# Alternativ 2: Läs DOIs från fil
def load_dois_from_file(filepath="dois.txt"):
    """Läs DOIs från textfil (en per rad)."""
    path = Path(filepath)
    if path.exists():
        with open(path, 'r') as f:
            return [line.strip() for line in f if line.strip() and not line.startswith('#')]
    return []

# Alternativ 3: Läs URLs direkt från fil
def load_urls_from_file(filepath="pdf_urls.txt"):
    """Läs direkta PDF-URLs från textfil."""
    path = Path(filepath)
    if path.exists():
        with open(path, 'r') as f:
            return [line.strip() for line in f if line.strip().startswith('http')]
    return []

# ============================================================
# URL-BYGGARE - ANPASSA TILL DIN DATABAS
# ============================================================

def build_pdf_url(doi: str, database: str = "emerald") -> str:
    """
    Bygg PDF-URL från DOI baserat på databas.
    Anpassa dessa mönster till din faktiska databas.
    """
    if database == "emerald":
        # Emerald Insight
        return f"https://www.emerald.com/insight/content/doi/{doi}/full/pdf"
    
    elif database == "ebsco":
        # EBSCO - formatet varierar, kolla din faktiska URL
        return f"https://content.ebscohost.com/ContentServer.asp?T=P&P=AN&K={doi}&S=L&D=bth&EbscoContent=pdf"
    
    elif database == "sciencedirect":
        # ScienceDirect/Elsevier
        return f"https://www.sciencedirect.com/science/article/pii/{doi}/pdfft"
    
    elif database == "springer":
        # Springer
        return f"https://link.springer.com/content/pdf/{doi}.pdf"
    
    elif database == "wiley":
        # Wiley
        return f"https://onlinelibrary.wiley.com/doi/pdfdirect/{doi}"
    
    else:
        # Generisk DOI-resolver (oftast redirect)
        return f"https://doi.org/{doi}"

# ============================================================
# DOWNLOAD-FUNKTION
# ============================================================

def download_pdf(url: str, filename: str, output_dir: Path = OUTPUT_DIR) -> bool:
    """
    Ladda ner en PDF från URL.
    
    Args:
        url: Direkt URL till PDF
        filename: Filnamn att spara som
        output_dir: Mapp att spara i
    
    Returns:
        True om lyckad, False annars
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    filepath = output_dir / filename
    
    # Skippa om redan nedladdad
    if filepath.exists() and filepath.stat().st_size > 1000:
        print(f"  Redan nedladdad: {filename}")
        return True
    
    try:
        response = requests.get(
            url,
            cookies=cookies,
            headers=headers,
            timeout=60,
            allow_redirects=True
        )
        
        # Kolla content-type
        content_type = response.headers.get('content-type', '').lower()
        
        if response.status_code == 200:
            # Verifiera att det är en PDF
            if 'pdf' in content_type or response.content[:4] == b'%PDF':
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                size_kb = len(response.content) / 1024
                print(f"  OK: {filename} ({size_kb:.1f} KB)")
                return True
            else:
                print(f"  FEL: Inte PDF ({content_type[:50]})")
                return False
        else:
            print(f"  FEL: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"  FEL: Timeout")
        return False
    except Exception as e:
        print(f"  FEL: {e}")
        return False

# ============================================================
# HUVUDPROGRAM
# ============================================================

def main():
    print("=" * 50)
    print("  PDF Downloader med Cookies")
    print("=" * 50)
    
    # Kontrollera att cookies är konfigurerade
    if not cookies:
        print("\n⚠️  VARNING: Inga cookies konfigurerade!")
        print("   1. Logga in i webbläsaren")
        print("   2. Kopiera cURL från DevTools")
        print("   3. Använd curlconverter.com")
        print("   4. Klistra in cookies i detta script")
        return
    
    # Ladda DOIs
    if not dois:
        # Försök ladda från fil
        loaded_dois = load_dois_from_file("dois.txt")
        if loaded_dois:
            print(f"\nLaddade {len(loaded_dois)} DOIs från dois.txt")
            target_dois = loaded_dois
        else:
            print("\nInga DOIs konfigurerade. Lägg till i 'dois' listan eller skapa dois.txt")
            return
    else:
        target_dois = dois
    
    print(f"\nLaddar ner {len(target_dois)} PDFs...")
    print(f"Output: {OUTPUT_DIR.absolute()}")
    print("-" * 50)
    
    success = 0
    failed = []
    
    for i, doi in enumerate(target_dois, 1):
        print(f"[{i}/{len(target_dois)}] {doi}")
        
        # Bygg URL och filnamn
        url = build_pdf_url(doi, database="emerald")  # Ändra databas här
        filename = doi.replace('/', '_').replace('.', '-') + '.pdf'
        
        if download_pdf(url, filename):
            success += 1
        else:
            failed.append(doi)
        
        # Vänta mellan requests
        if i < len(target_dois):
            time.sleep(DELAY)
    
    # Sammanfattning
    print("\n" + "=" * 50)
    print(f"  Klart! {success}/{len(target_dois)} nedladdade")
    print("=" * 50)
    
    if failed:
        print(f"\nMisslyckade ({len(failed)}):")
        for doi in failed:
            print(f"  - {doi}")
        
        # Spara misslyckade till fil
        with open("failed_downloads.txt", 'w') as f:
            f.write('\n'.join(failed))
        print("\nMisslyckade sparade till failed_downloads.txt")

if __name__ == "__main__":
    main()
