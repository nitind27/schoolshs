Private Sub Workbook_Open()
    On Error Resume Next
    AddSheetButton
    Application.OnTime Now + TimeValue("00:00:01"), "'" & Replace(ThisWorkbook.Name, "'", "''") & "'!OpenStudentForm"
End Sub
