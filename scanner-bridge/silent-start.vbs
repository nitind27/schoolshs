' Hidden scanner helper — school staff never need a console or npm command.
' When run from scanner-bridge\silent-start.vbs, project root is the parent folder.
Option Explicit
Dim sh, fso, here, root, marker, cmd
Set sh = CreateObject("Wscript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
root = here
If fso.FileExists(here & "\server.ts") Or fso.FolderExists(here & "\scanner-bridge") Then
  root = here
ElseIf fso.FileExists(here & "\..\server.ts") Then
  root = fso.GetAbsolutePathName(here & "\..")
ElseIf fso.FileExists(here & "\project-root.txt") Then
  root = Trim(fso.OpenTextFile(here & "\project-root.txt", 1).ReadLine())
End If
sh.CurrentDirectory = root
cmd = "cmd /c npx --yes tsx scanner-bridge/server.ts"
sh.Run cmd, 0, False
