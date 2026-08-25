Attribute VB_Name = "modStudentForm"
Option Explicit

' Sheet-only entry — no popup UserForm

Public Sub Auto_Open()
    On Error Resume Next
    AddSheetButtons
    GoToEntryForm
End Sub

Public Sub OnRibbonLoad(Optional ribbon As Object)
    On Error Resume Next
    AddSheetButtons
End Sub

Public Sub OpenStudentFormBtn(Optional control As Object)
    GoToEntryForm
End Sub

Public Sub SaveStudentRowBtn(Optional control As Object)
    SaveStudentRow
End Sub

Public Sub ClearEntryFormBtn(Optional control As Object)
    ClearEntryForm
End Sub

Public Sub GoToEntryForm()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Entry Form")
    If ws Is Nothing Then Exit Sub
    ws.Activate
    ws.Range("B6").Select
End Sub

Public Sub SaveStudentRow()
    On Error GoTo fail
    SaveStudentRowFromEntry True
    Exit Sub
fail:
    RestoreExcelState
    MsgBox "Could not save row: " & Err.Description & " (" & Err.Number & ")", vbExclamation, "Add student"
End Sub

Public Sub QuietSaveStudentRow()
    SaveStudentRowFromEntry False
End Sub

Public Sub SaveStudentRowFromEntry(Optional ByVal showOk As Boolean = True)
    Dim meta As Worksheet
    Dim entry As Worksheet
    Dim dest As Worksheet
    Dim i As Long
    Dim n As Long
    Dim destCol As Long
    Dim inputRow As Long
    Dim required As String
    Dim labelText As String
    Dim val As String
    Dim r As Long
    Dim alerts As Boolean
    Dim events As Boolean
    Dim updating As Boolean
    Dim errNum As Long
    Dim errDesc As String

    Set meta = ThisWorkbook.Worksheets("FormMeta")
    Set entry = ThisWorkbook.Worksheets("Entry Form")
    Set dest = ThisWorkbook.Worksheets("Students")

    i = 2
    n = 0
    Do While Len(Trim$(CStr(meta.Cells(i, 1).Value))) > 0
        required = UCase$(Trim$(CStr(meta.Cells(i, 5).Value)))
        inputRow = CLng(Val(CStr(meta.Cells(i, 8).Value)))
        val = ""
        If inputRow >= 6 Then val = Trim$(CStr(entry.Cells(inputRow, 2).Value))
        If required = "Y" And Len(val) = 0 Then
            labelText = Trim$(CStr(meta.Cells(i, 3).Value))
            If showOk Then
                entry.Activate
                If inputRow >= 6 Then entry.Cells(inputRow, 2).Select
            End If
            MsgBox labelText & " is required.", vbExclamation, "Add student"
            Exit Sub
        End If
        n = n + 1
        i = i + 1
    Loop

    If n < 1 Then
        MsgBox "No fields found on FormMeta.", vbExclamation, "Add student"
        Exit Sub
    End If

    alerts = Application.DisplayAlerts
    events = Application.EnableEvents
    updating = Application.ScreenUpdating
    Application.DisplayAlerts = False
    Application.EnableEvents = False
    Application.ScreenUpdating = False

    On Error GoTo cleanup
    r = NextEmptyRow(dest)

    i = 2
    Do While Len(Trim$(CStr(meta.Cells(i, 1).Value))) > 0
        destCol = CLng(Val(CStr(meta.Cells(i, 1).Value)))
        inputRow = CLng(Val(CStr(meta.Cells(i, 8).Value)))
        val = ""
        If inputRow >= 6 Then val = Trim$(CStr(entry.Cells(inputRow, 2).Value))
        If destCol >= 1 Then
            dest.Cells(r, destCol).NumberFormat = "@"
            dest.Cells(r, destCol).Value = val
        End If
        i = i + 1
    Loop

    Application.DisplayAlerts = alerts
    Application.EnableEvents = events
    Application.ScreenUpdating = updating

    If showOk Then
        ClearEntryForm
        dest.Activate
        MsgBox "Student saved on Students sheet row " & r & ".", vbInformation, "Added"
    End If
    Exit Sub

cleanup:
    errNum = Err.Number
    errDesc = Err.Description
    Application.DisplayAlerts = alerts
    Application.EnableEvents = events
    Application.ScreenUpdating = updating
    Err.Raise errNum, "SaveStudentRowFromEntry", errDesc
End Sub

Public Sub ClearEntryForm()
    Dim meta As Worksheet
    Dim entry As Worksheet
    Dim i As Long
    Dim inputRow As Long
    On Error Resume Next
    Set meta = ThisWorkbook.Worksheets("FormMeta")
    Set entry = ThisWorkbook.Worksheets("Entry Form")
    If meta Is Nothing Or entry Is Nothing Then Exit Sub
    i = 2
    Do While Len(Trim$(CStr(meta.Cells(i, 1).Value))) > 0
        inputRow = CLng(Val(CStr(meta.Cells(i, 8).Value)))
        If inputRow >= 6 Then entry.Cells(inputRow, 2).Value = ""
        i = i + 1
    Loop
    GoToEntryForm
End Sub

Public Sub AddSheetButtons()
    Dim ws As Worksheet
    Dim btn As Button
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Entry Form")
    If ws Is Nothing Then Exit Sub

    ws.Buttons.Delete
    Err.Clear

    Set btn = ws.Buttons.Add(420, 6, 150, 28)
    If Not btn Is Nothing Then
        btn.Name = "btnAddStudent"
        btn.OnAction = "SaveStudentRow"
        btn.Characters.Text = "Add to Students"
    End If
    Err.Clear

    Set btn = ws.Buttons.Add(580, 6, 70, 28)
    If Not btn Is Nothing Then
        btn.Name = "btnClearForm"
        btn.OnAction = "ClearEntryForm"
        btn.Characters.Text = "Clear"
    End If
End Sub

Public Sub RestoreExcelState()
    On Error Resume Next
    Application.DisplayAlerts = True
    Application.EnableEvents = True
    Application.ScreenUpdating = True
End Sub

Private Function NextEmptyRow(ws As Worksheet) As Long
    Dim r As Long
    Dim lastCol As Long
    Dim c As Long
    Dim used As Boolean
    lastCol = ws.Cells(1, ws.Columns.Count).End(-4159).Column
    If lastCol < 1 Then lastCol = 1
    For r = 2 To 5000
        used = False
        For c = 1 To lastCol
            If Len(Trim$(CStr(ws.Cells(r, c).Value))) > 0 Then
                used = True
                Exit For
            End If
        Next
        If Not used Then
            NextEmptyRow = r
            Exit Function
        End If
    Next
    NextEmptyRow = 5001
End Function
