import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

// Fixed read-only Windows ACL query. The path is passed in a private environment
// value and read with LiteralPath, never interpolated into executable text.
const script = `
$ErrorActionPreference='Stop'
$identity=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$acl=[System.IO.Directory]::GetAccessControl($env:CENTIPEDE_FILES_ACL_ROOT)
$owner=$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
$trusted=@($identity,'S-1-5-18','S-1-5-32-544')
if($trusted -notcontains $owner){exit 3}
# Workspace contents and even directory listings are private owner data.
# Windows inherited Users/Everyone READ is unsafe even if those users cannot write.
$sensitive=[System.Security.AccessControl.FileSystemRights]::Read -bor [System.Security.AccessControl.FileSystemRights]::Write -bor [System.Security.AccessControl.FileSystemRights]::ExecuteFile -bor [System.Security.AccessControl.FileSystemRights]::Delete -bor [System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership
foreach($ace in $acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])) {
 if($ace.AccessControlType -eq 'Allow' -and ($ace.FileSystemRights -band $sensitive) -ne 0 -and $trusted -notcontains $ace.IdentityReference.Value){exit 4}
}
[Console]::Out.WriteLine('PRIVATE')
exit 0
`;
export async function isPrivateWindowsDirectory(path: string): Promise<boolean> {
  try {
    const command = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = await promisify(execFile)(command, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
      env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR, CENTIPEDE_FILES_ACL_ROOT: path },
      timeout: 10_000, maxBuffer: 4096, windowsHide: true,
    });
    return result.stdout.trim() === 'PRIVATE';
  } catch { return false; }
}
