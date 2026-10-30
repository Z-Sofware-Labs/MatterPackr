Name:           matterpackr
Version:        3.0.11
Release:        1%{?dist}
Summary:        Modern Multi-Threaded Compression & Archive Utility
License:        Proprietary
URL:            https://github.com/Z-Sofware-Labs/MatterPackr
AutoReqProv:    no

%description
Modern, fast, and multi-threaded desktop compression and archive tool built with Qt 6.

%install
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/applications
mkdir -p %{buildroot}/usr/share/icons/hicolor/256x256/apps
mkdir -p %{buildroot}/usr/share/icons/hicolor/256x256/mimetypes

install -m 755 %{workspace_root}/native-qt/build/MatterPackr %{buildroot}/usr/bin/MatterPackr
install -m 644 %{workspace_root}/packaging/linux/matterpackr.desktop %{buildroot}/usr/share/applications/matterpackr.desktop
install -m 644 %{workspace_root}/native-qt/resources/app.png %{buildroot}/usr/share/icons/hicolor/256x256/apps/matterpackr.png
cp %{workspace_root}/packaging/linux/icons/hicolor/256x256/mimetypes/*.png %{buildroot}/usr/share/icons/hicolor/256x256/mimetypes/

%files
/usr/bin/MatterPackr
/usr/share/applications/matterpackr.desktop
/usr/share/icons/hicolor/256x256/apps/matterpackr.png
/usr/share/icons/hicolor/256x256/mimetypes/*.png

%changelog
* Fri Oct 30 2026 Z Software Labs - 3.0.11-1
- Release version 3.0.11
