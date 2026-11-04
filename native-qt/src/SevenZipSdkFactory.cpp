#ifdef MATTERPACKR_HAS_7Z_SDK

#include "7zip/Archive/7z/7zHandler.h"

extern "C" void *matterpackr_create_7z_writer() {
  return static_cast<NArchive::N7z::CHandler *>(
      new NArchive::N7z::CHandler());
}

#endif
