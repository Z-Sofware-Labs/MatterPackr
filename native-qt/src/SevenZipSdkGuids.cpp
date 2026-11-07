// Instantiates the 7-Zip coder/stream interface GUIDs across all platforms.
// We avoid DllExportsCompress.cpp because CreateCoder.cpp already defines
// the codec registry (RegisterCodec/RegisterHasher/g_Codecs).
#ifdef MATTERPACKR_HAS_7Z_SDK

#include "Common/MyInitGuid.h"
#include "7zip/ICoder.h"

#endif


