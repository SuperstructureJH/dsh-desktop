// Test-only stack inspection of the isolated Office worker on a Windows CI host.
#include <windows.h>
#include <tlhelp32.h>
#include <dbghelp.h>
#include <iostream>
#include <string>
#pragma comment(lib, "dbghelp.lib")
int wmain(int argc, wchar_t** argv) {
  if (argc != 2) return 1;
  DWORD pid = std::stoul(argv[1]);
  HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
  if (!process) { std::cerr << "OpenProcess: " << GetLastError() << '\n'; return 1; }
  SymSetOptions(SYMOPT_UNDNAME | SYMOPT_DEFERRED_LOADS | SYMOPT_FAIL_CRITICAL_ERRORS | SYMOPT_NO_PROMPTS);
  if (!SymInitialize(process, nullptr, TRUE)) std::cerr << "SymInitialize: " << GetLastError() << '\n';
  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
  THREADENTRY32 entry{}; entry.dwSize = sizeof(entry);
  unsigned count = 0;
  if (Thread32First(snapshot, &entry)) do {
    if (entry.th32OwnerProcessID != pid || ++count > 16) continue;
    HANDLE thread = OpenThread(THREAD_GET_CONTEXT | THREAD_SUSPEND_RESUME | THREAD_QUERY_INFORMATION, FALSE, entry.th32ThreadID);
    if (!thread) continue;
    if (SuspendThread(thread) == static_cast<DWORD>(-1)) { CloseHandle(thread); continue; }
    CONTEXT context{}; context.ContextFlags = CONTEXT_FULL;
    if (GetThreadContext(thread, &context)) {
      std::cout << "Office thread " << entry.th32ThreadID << '\n';
      STACKFRAME64 frame{};
      frame.AddrPC.Offset = context.Rip; frame.AddrPC.Mode = AddrModeFlat;
      frame.AddrStack.Offset = context.Rsp; frame.AddrStack.Mode = AddrModeFlat;
      frame.AddrFrame.Offset = context.Rbp; frame.AddrFrame.Mode = AddrModeFlat;
      for (unsigned i = 0; i < 24 && frame.AddrPC.Offset; ++i) {
        IMAGEHLP_MODULE64 module{}; module.SizeOfStruct = sizeof(module);
        SymGetModuleInfo64(process, frame.AddrPC.Offset, &module);
        alignas(SYMBOL_INFO) char buffer[sizeof(SYMBOL_INFO) + MAX_SYM_NAME]{};
        auto* symbol = reinterpret_cast<SYMBOL_INFO*>(buffer);
        symbol->SizeOfStruct = sizeof(SYMBOL_INFO); symbol->MaxNameLen = MAX_SYM_NAME;
        DWORD64 offset = 0;
        std::cout << "  " << module.ModuleName << "+0x" << std::hex << (frame.AddrPC.Offset - module.BaseOfImage);
        if (SymFromAddr(process, frame.AddrPC.Offset, &offset, symbol)) std::cout << " " << symbol->Name << "+0x" << offset;
        std::cout << std::dec << '\n';
        if (!StackWalk64(IMAGE_FILE_MACHINE_AMD64, process, thread, &frame, &context, nullptr, SymFunctionTableAccess64, SymGetModuleBase64, nullptr)) break;
      }
    }
    ResumeThread(thread); CloseHandle(thread);
  } while (Thread32Next(snapshot, &entry));
  CloseHandle(snapshot); SymCleanup(process); CloseHandle(process);
  return 0;
}
