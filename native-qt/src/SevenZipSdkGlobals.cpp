#ifdef MATTERPACKR_HAS_7Z_SDK

#include "7zip/Archive/IArchive.h"
#include "7zip/Common/CreateCoder.h"
#include "7zip/IPassword.h"

extern "C" const GUID IID_ICryptoGetTextPassword = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 5, 0, 0x10, 0, 0}};
extern "C" const GUID IID_ISetProperties = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 6, 0, 0x03, 0, 0}};
extern "C" const GUID IID_ICryptoGetTextPassword2 = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 5, 0, 0x11, 0, 0}};
extern "C" const GUID IID_IInArchive = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 6, 0, 0x60, 0, 0}};
extern "C" const GUID IID_IArchiveGetRawProps = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 6, 0, 0x70, 0, 0}};
extern "C" const GUID IID_IArchiveUpdateCallbackFile = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 6, 0, 0x83, 0, 0}};
extern "C" const GUID IID_IArchiveUpdateCallback = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 6, 0, 0x80, 0, 0}};
extern "C" const GUID IID_IArchiveExtractCallbackMessage2 = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 6, 0, 0x22, 0, 0}};
extern "C" const GUID IID_IOutArchive = {
    k_7zip_GUID_Data1, k_7zip_GUID_Data2, k_7zip_GUID_Data3_Common,
    {0, 0, 0, 6, 0, 0xA0, 0, 0}};

CExternalCodecs g_ExternalCodecs;

#endif
