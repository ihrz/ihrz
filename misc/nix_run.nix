{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Dépendances pour Puppeteer/Chrome
    glib
    xorg.libX11
    xorg.libXext
    xorg.libXi
    xorg.libXrender
    xorg.libXtst
    xorg.libXrandr
    xorg.libXcomposite
    xorg.libXcursor
    xorg.libXdamage
    xorg.libXfixes
    xorg.libXinerama
    xorg.libXScrnSaver
    libxkbcommon
    nss
    nspr
    alsa-lib
    atk
    at-spi2-atk
    at-spi2-core
    cups
    dbus
    expat
    fontconfig
    freetype
    cairo
    pango
    gtk3
    zlib
    
    # Dépendances pour Sharp
    stdenv.cc.cc.lib  # Pour libstdc++.so.6
    vips              # La bibliothèque sous-jacente à Sharp
    libpng
    libjpeg
    
    # Pour le développement Node.js/Bun
    # bun
    nodejs
  ];

  shellHook = ''
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    export PUPPETEER_EXECUTABLE_PATH=${pkgs.chromium}/bin/chromium
  '';
}