// A one-document LibreOfficeKit worker, always launched inside the Office LPAC.
// The embedded API disables desktop-instance IPC and keeps every document load
// in the private profile, with macro execution disabled and dialogs cancelled.
#define _WIN32_WINNT 0x0A00
#include <windows.h>
#include <LibreOfficeKit/LibreOfficeKit.h>
#include <string>
#include <stdexcept>
#include <iostream>
#include <memory>

static std::string utf8(const wchar_t* value) {
  int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value, -1, nullptr, 0, nullptr, nullptr);
  if (!size) throw std::runtime_error("Invalid UTF-16 Office argument");
  std::string result(static_cast<size_t>(size), '\0');
  if (!WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value, -1, result.data(), size, nullptr, nullptr))
    throw std::runtime_error("Office argument encoding failed");
  result.pop_back();
  return result;
}
static std::string engineError(LibreOfficeKit* kit) {
  char* error = kit->pClass->getError(kit);
  std::string result = error ? error : "Unknown LibreOfficeKit error";
  if (error) kit->pClass->freeError(error);
  return result;
}
// CI startup diagnostics use the engine's own stable SAL filesystem API.
static void probePaths(HMODULE sal, wchar_t** argv) {
  struct String;
  using NewString = void (*)(String**, const wchar_t*);
  using Release = void (*)(String*);
  using Convert = int (*)(String*, String**);
  using Absolute = int (*)(String*, String*, String**);
  using Item = int (*)(String*, void**);
  using ReleaseItem = int (*)(void*);
  auto create = reinterpret_cast<NewString>(GetProcAddress(sal, "rtl_uString_newFromStr"));
  auto release = reinterpret_cast<Release>(GetProcAddress(sal, "rtl_uString_release"));
  auto toUrl = reinterpret_cast<Convert>(GetProcAddress(sal, "osl_getFileURLFromSystemPath"));
  auto absolute = reinterpret_cast<Absolute>(GetProcAddress(sal, "osl_getAbsoluteFileURL"));
  auto item = reinterpret_cast<Item>(GetProcAddress(sal, "osl_getDirectoryItem"));
  auto releaseItem = reinterpret_cast<ReleaseItem>(GetProcAddress(sal, "osl_releaseDirectoryItem"));
  if (!create || !release || !toUrl || !absolute || !item || !releaseItem)
    throw std::runtime_error("SAL filesystem diagnostic API is missing");
  for (int i = 1; i <= 3; ++i) {
    String *url = nullptr, *normalized = nullptr;
    create(&url, argv[i]);
    if (i == 1) { String* converted = nullptr; int rc = toUrl(url, &converted); release(url); url = converted; std::cerr << "SAL path " << i << " toURL=" << rc << '\n'; }
    if (!url) continue;
    int rc = absolute(nullptr, url, &normalized);
    void* handle = nullptr;
    int found = item(normalized ? normalized : url, &handle);
    std::cerr << "SAL path " << i << " absolute=" << rc << " item=" << found << '\n';
    if (handle) releaseItem(handle);
    if (normalized) release(normalized);
    release(url);
  }
}
int wmain(int argc, wchar_t** argv) {
  try {
    if (argc != 6) throw std::runtime_error("Expected program directory, profile URL, input URL, output URL and format");
    std::wstring program = argv[1];
    if (program.size() < 3 || program[1] != L':' || program[2] != L'\\')
      throw std::runtime_error("LibreOffice program directory must be an absolute local path");
    const auto format = utf8(argv[5]);
    if (format != "pdf" && format != "xlsx") throw std::runtime_error("Office conversion format must be pdf or xlsx");
    if (!SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_DEFAULT_DIRS) || !AddDllDirectory(program.c_str()))
      throw std::runtime_error("Configure LibreOffice DLL directory: " + std::to_string(GetLastError()));
    HMODULE library = nullptr;
    for (const auto* name : { L"sofficeapp.dll", L"mergedlo.dll" }) {
      library = LoadLibraryExW((program + L"\\" + name).c_str(), nullptr,
        LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);
      if (library) break;
    }
    if (!library) throw std::runtime_error("Load LibreOfficeKit: " + std::to_string(GetLastError()));
    if (GetEnvironmentVariableW(L"DSH_OFFICE_DIAGNOSTICS", nullptr, 0)) probePaths(GetModuleHandleW(L"sal3.dll"), argv);
    // Keep the module loaded until process exit; LibreOffice owns global objects.
    using Initialize = LibreOfficeKit* (*)(const char*, const char*);
    auto initialize = reinterpret_cast<Initialize>(GetProcAddress(library, "libreofficekit_hook_2"));
    if (!initialize) throw std::runtime_error("LibreOfficeKit entry point is missing");
    std::cerr << "OFFICE_CONVERT: initialize\n";
    auto* rawKit = initialize(utf8(argv[1]).c_str(), utf8(argv[2]).c_str());
    if (!rawKit) throw std::runtime_error("LibreOfficeKit initialization failed");
    std::unique_ptr<LibreOfficeKit, void (*)(LibreOfficeKit*)> kit(rawKit, rawKit->pClass->destroy);
    if (!LIBREOFFICEKIT_HAS(kit.get(), freeError)) throw std::runtime_error("LibreOfficeKit ABI is too old");
    std::cerr << "OFFICE_CONVERT: load\n";
    auto* rawDocument = kit->pClass->documentLoadWithOptions(kit.get(), utf8(argv[3]).c_str(),
      "Batch=true,EnableMacrosExecution=false,MacroSecurityLevel=3");
    if (!rawDocument) throw std::runtime_error("Load document: " + engineError(kit.get()));
    std::unique_ptr<LibreOfficeKitDocument, void (*)(LibreOfficeKitDocument*)> document(rawDocument, rawDocument->pClass->destroy);
    std::cerr << "OFFICE_CONVERT: save\n";
    if (!document->pClass->saveAs(document.get(), utf8(argv[4]).c_str(), format.c_str(), nullptr))
      throw std::runtime_error("Save document: " + engineError(kit.get()));
    std::cerr << "OFFICE_CONVERT: complete\n";
    return 0;
  } catch (const std::exception& error) {
    std::cerr << "OFFICE_CONVERT_FAILED: " << error.what() << '\n';
    return 1;
  }
}
