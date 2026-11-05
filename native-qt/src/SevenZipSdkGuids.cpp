// Instantiates the 7-Zip coder/stream interface GUIDs on non-Windows platforms.
// On Windows these come from DllExportsCompress.cpp, which cannot be used on
// Unix because CreateCoder.cpp already defines the codec registry there.
#ifdef MATTERPACKR_HAS_7Z_SDK
#ifndef _WIN32

#include "Common/MyInitGuid.h"
#include "7zip/ICoder.h"

#endif
#endif
