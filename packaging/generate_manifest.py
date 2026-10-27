import json
import sys

def main():
    if len(sys.argv) < 5:
        print("Usage: generate_manifest.py <version> <pub_date> <win_sig> <linux_sig> [mac_sig]")
        sys.exit(1)

    version = sys.argv[1].lstrip("v")
    pub_date = sys.argv[2]
    win_sig = sys.argv[3]
    linux_sig = sys.argv[4]
    mac_sig = sys.argv[5] if len(sys.argv) > 5 else ""

    platforms = {
        "windows-x86_64": {
            "signature": win_sig,
            "url": f"https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v{version}/MatterPackr-v{version}-windows-x64-Setup.exe"
        },
        "windows-x86_64-nsis": {
            "signature": win_sig,
            "url": f"https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v{version}/MatterPackr-v{version}-windows-x64-Setup.exe"
        },
        "windows-x86_64-msi": {
            "signature": win_sig,
            "url": f"https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v{version}/MatterPackr-v{version}-windows-x64-Setup.exe"
        },
        "linux-x86_64": {
            "signature": linux_sig,
            "url": f"https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v{version}/MatterPackr-v{version}-linux-x86_64.tar.gz"
        }
    }

    if mac_sig:
        platforms["darwin-x86_64"] = {
            "signature": mac_sig,
            "url": f"https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v{version}/MatterPackr-v{version}-macos-universal.zip"
        }
        platforms["darwin-aarch64"] = {
            "signature": mac_sig,
            "url": f"https://github.com/Z-Sofware-Labs/MatterPackr/releases/download/v{version}/MatterPackr-v{version}-macos-universal.zip"
        }

    data = {
        "version": version,
        "notes": f"MatterPackr {version} - Native Qt 6 Rewrite with multi-threaded compression & AES-256.",
        "pub_date": pub_date,
        "platforms": platforms
    }

    with open("latest.json", "w") as f:
        json.dump(data, f, indent=2)

    print(f"Generated latest.json successfully for version {version}.")

if __name__ == "__main__":
    main()
