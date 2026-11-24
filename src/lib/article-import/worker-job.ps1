# Put this process in a kill-on-close job before it starts the native worker.
# Its child and the private CLI server inherit the job. The handle is not inheritable.
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class ArticleWorkerJob {
    [StructLayout(LayoutKind.Sequential)]
    struct BasicLimits {
        public long ProcessTime, JobTime;
        public uint Flags;
        public UIntPtr MinWorkingSet, MaxWorkingSet;
        public uint ActiveLimit;
        public UIntPtr Affinity;
        public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct ExtendedLimits {
        public BasicLimits Basic;
        public ulong ReadOps, WriteOps, OtherOps, ReadBytes, WriteBytes, OtherBytes;
        public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
    }
    [DllImport("kernel32", SetLastError=true)]
    static extern IntPtr CreateJobObject(IntPtr security, string name);
    [DllImport("kernel32", SetLastError=true)]
    static extern bool SetInformationJobObject(IntPtr job, int kind, ref ExtendedLimits data, int length);
    [DllImport("kernel32", SetLastError=true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32")]
    static extern IntPtr GetCurrentProcess();
    public static void Enter() {
        var job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Win32Exception();
        var limits = new ExtendedLimits();
        limits.Basic.Flags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if (!SetInformationJobObject(job, 9, ref limits, Marshal.SizeOf<ExtendedLimits>()))
            throw new Win32Exception();
        if (!AssignProcessToJobObject(job, GetCurrentProcess())) throw new Win32Exception();
    }
}
"@
[ArticleWorkerJob]::Enter()
$invocation = [Console]::In.ReadToEnd() | ConvertFrom-Json
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = $invocation.executable
$start.WorkingDirectory = $invocation.cwd
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in $invocation.args) { $start.ArgumentList.Add([string]$argument) }
$workerProcess = [Diagnostics.Process]::Start($start)
$outputCopy = $workerProcess.StandardOutput.BaseStream.CopyToAsync([Console]::OpenStandardOutput())
$errorCopy = $workerProcess.StandardError.BaseStream.CopyToAsync([Console]::OpenStandardError())
$workerProcess.WaitForExit()
[System.Threading.Tasks.Task]::WaitAll($outputCopy, $errorCopy)
exit $workerProcess.ExitCode
