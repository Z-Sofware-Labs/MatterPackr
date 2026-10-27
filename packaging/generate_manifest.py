import json
import sys

def main():
    if len(sys.argv) < 4:
        print("Usage: generate_manifest.py <pub_date> <win_sig> <linux_sig> [mac_sig]")
        sys.exit(1)

    pub_date = sys.argv[1]
    win_sig = sys.argv[2]
    linux_sig = sys.argv[3]
    mac_sig = sys.argv[4] if len(sys.argv) > 4 else ""

    platforms = {
        "windows-x86_64": {
            "signature": win_sig,
            "url": "https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v3.0.0/MatterPackr-v3.0.0-windows-x64-Setup.exe"
        },
        "windows-x86_64-nsis": {
            "signature": win_sig,
            "url": "https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v3.0.0/MatterPackr-v3.0.0-windows-x64-Setup.exe"
        },
        "windows-x86_64-msi": {
            "signature": win_sig,
            "url": "https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v3.0.0/MatterPackr-v3.0.0-windows-x64-Setup.exe"
        },
        "linux-x86_64": {
            "signature": linux_sig,
            "url": "https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v3.0.0/MatterPackr-v3.0.0-linux-x86_64.tar.gz"
        }
    }

    if mac_sig:
        platforms["darwin-x86_64"] = {
            "signature": mac_sig,
            "url": "https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v3.0.0/MatterPackr-v3.0.0-macos-universal.zip"
        }
        platforms["darwin-aarch64"] = {
            "signature": mac_sig,
            "url": "https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v3.0.0/MatterPackr-v3.0.0-macos-universal.zip"
        }

    data = {
        "version": "3.0.0",
        "notes": "MatterPackr 3.0.0 - Native Qt 6 Rewrite with multi-threaded compression & AES-256.",
        "pub_date": pub_date,
        "platforms": platforms
    }

    with open("latest.json", "w") as f:
        json.dump(data, f, indent=2)

    print("Generated latest.json successfully.")

if __name__ == "__main__":
    main()
