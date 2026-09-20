# Windows Office conversion worker

`main.cpp` loads the bundled LibreOfficeKit stable C API in the Office AppContainer.
Each invocation loads one document with macros disabled, exports PDF or XLSX,
and releases the document and engine. The host supplies a private profile and
enforces filesystem, network, process and timeout policy.

LibreOfficeKit initializes `RequestHandler` with desktop-instance IPC disabled.
This matches the worker's one-process, one-profile lifecycle and the Windows
AppContainer named-object namespace.

The unmodified headers in `include/LibreOfficeKit` come from LibreOffice
`libreoffice-26.2.6.2`, under Mozilla Public License 2.0:

- [LibreOfficeKit.h](https://github.com/LibreOffice/core/blob/libreoffice-26.2.6.2/include/LibreOfficeKit/LibreOfficeKit.h)
- [LibreOfficeKitTypes.h](https://github.com/LibreOffice/core/blob/libreoffice-26.2.6.2/include/LibreOfficeKit/LibreOfficeKitTypes.h)
- [API initialization and document loading](https://github.com/LibreOffice/core/blob/libreoffice-26.2.6.2/desktop/source/lib/init.cxx)

The staged LibreOffice distribution includes its license notices. Build with
`scripts/stage-office-runtime-windows.ps1` using Visual Studio C++ x64 tools.
