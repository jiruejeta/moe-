// =========================================================
// EXCEL EXPORT
//   ?mode=by-course  (default)  → one sheet per COURSE
//   ?mode=by-class              → one sheet per CLASS
//   ?mode=flat                  → one sheet, grouped inside
//   Optional filters: department, className, courseCode
// =========================================================
router.get('/export/excel', verifyToken, isAdmin, async (req, res) => {
  try {
    const { department, className, courseCode, mode } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (className) filter.className = className;
    if (courseCode) filter.courseCode = courseCode;

    const results = await Result.find(filter).sort({
      department: 1,
      className: 1,
      courseCode: 1,
      studentName: 1,
    });

    if (!results.length) {
      return res.status(404).json({ message: 'No results to export' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Exam Portal';
    workbook.created = new Date();

    // ---------- helpers ----------
    const sanitize = (s) =>
      (s || 'Sheet').replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);

    const setHeaderRow = (ws) => {
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D3B8E' },
      };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 13 } };
    };

    const baseColumns = [
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Class', key: 'className', width: 18 },
      { header: 'Course', key: 'course', width: 30 },
      { header: 'Student Name', key: 'studentName', width: 26 },
      { header: 'Username', key: 'studentUsername', width: 18 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Total Questions', key: 'totalQuestions', width: 15 },
      { header: 'Correct', key: 'correctAnswers', width: 10 },
      { header: 'Incorrect', key: 'incorrectAnswers', width: 12 },
      { header: 'Percentage (%)', key: 'percentage', width: 15 },
      { header: 'Time Spent (min)', key: 'timeSpent', width: 15 },
      { header: 'Violations', key: 'violations', width: 12 },
      { header: 'Completed At', key: 'completedAt', width: 22 },
    ];

    // ---------- Mode: BY COURSE (default) ----------
    if (mode !== 'by-class' && mode !== 'flat') {
      // group by course
      const byCourse = {};
      results.forEach((r) => {
        const key = `${r.courseName} (${r.courseCode})`;
        byCourse[key] = byCourse[key] || [];
        byCourse[key].push(r);
      });

      Object.entries(byCourse).forEach(([courseLabel, rows]) => {
        const ws = workbook.addWorksheet(sanitize(courseLabel));
        ws.columns = baseColumns;

        // Group inside the course sheet: Department -> Class
        const grouped = {};
        rows.forEach((r) => {
          const dept = r.department || 'Unassigned';
          const cls = r.className || 'Unassigned';
          grouped[dept] = grouped[dept] || {};
          grouped[dept][cls] = grouped[dept][cls] || [];
          grouped[dept][cls].push(r);
        });

        setHeaderRow(ws);
        let rowIndex = 2;

        Object.entries(grouped).forEach(([dept, classes]) => {
          // Department banner
          const dRow = ws.getRow(rowIndex);
          dRow.getCell(1).value = `DEPARTMENT: ${dept}`;
          ws.mergeCells(rowIndex, 1, rowIndex, 13);
          dRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF0D3B8E' } };
          dRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5EEF7' },
          };
          rowIndex++;

          Object.entries(classes).forEach(([cls, classRows]) => {
            const cRow = ws.getRow(rowIndex);
            cRow.getCell(1).value = `CLASS: ${cls}`;
            ws.mergeCells(rowIndex, 1, rowIndex, 13);
            cRow.getCell(1).font = { bold: true, size: 11 };
            cRow.getCell(1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' },
            };
            rowIndex++;

            classRows.forEach((r) => {
              const row = ws.getRow(rowIndex);
              row.values = [
                r.department,
                r.className,
                `${r.courseName} (${r.courseCode})`,
                r.studentName,
                r.studentUsername,
                r.score,
                r.totalQuestions,
                r.correctAnswers,
                r.incorrectAnswers,
                r.percentage,
                r.timeSpent || 0,
                r.violations || 0,
                new Date(r.completedAt).toLocaleString(),
              ];
              rowIndex++;
            });

            // Class subtotal for this course
            const avg =
              classRows.reduce((a, b) => a + (b.percentage || 0), 0) /
              classRows.length;
            const sub = ws.getRow(rowIndex);
            sub.getCell(4).value = `Sub-total: ${classRows.length} student(s)`;
            sub.getCell(10).value = `Avg: ${avg.toFixed(1)}%`;
            sub.font = { bold: true };
            sub.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF7E0' },
            };
            rowIndex += 2;
          });
        });
      });
    }
    // ---------- Mode: BY CLASS ----------
    else if (mode === 'by-class') {
      const byClass = {};
      results.forEach((r) => {
        const key = r.className || 'Unassigned';
        byClass[key] = byClass[key] || [];
        byClass[key].push(r);
      });

      Object.entries(byClass).forEach(([cls, rows]) => {
        const ws = workbook.addWorksheet(sanitize(cls));
        ws.columns = baseColumns;

        // Group inside class sheet: Department -> Course
        const grouped = {};
        rows.forEach((r) => {
          const dept = r.department || 'Unassigned';
          const course = `${r.courseName} (${r.courseCode})`;
          grouped[dept] = grouped[dept] || {};
          grouped[dept][course] = grouped[dept][course] || [];
          grouped[dept][course].push(r);
        });

        setHeaderRow(ws);
        let rowIndex = 2;

        Object.entries(grouped).forEach(([dept, courses]) => {
          const dRow = ws.getRow(rowIndex);
          dRow.getCell(1).value = `DEPARTMENT: ${dept}`;
          ws.mergeCells(rowIndex, 1, rowIndex, 13);
          dRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF0D3B8E' } };
          dRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5EEF7' },
          };
          rowIndex++;

          Object.entries(courses).forEach(([courseLabel, courseRows]) => {
            const coRow = ws.getRow(rowIndex);
            coRow.getCell(1).value = `COURSE: ${courseLabel}`;
            ws.mergeCells(rowIndex, 1, rowIndex, 13);
            coRow.getCell(1).font = { bold: true, italic: true, size: 11 };
            coRow.getCell(1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9F9F9' },
            };
            rowIndex++;

            courseRows.forEach((r) => {
              const row = ws.getRow(rowIndex);
              row.values = [
                r.department,
                r.className,
                `${r.courseName} (${r.courseCode})`,
                r.studentName,
                r.studentUsername,
                r.score,
                r.totalQuestions,
                r.correctAnswers,
                r.incorrectAnswers,
                r.percentage,
                r.timeSpent || 0,
                r.violations || 0,
                new Date(r.completedAt).toLocaleString(),
              ];
              rowIndex++;
            });

            const avg =
              courseRows.reduce((a, b) => a + (b.percentage || 0), 0) /
              courseRows.length;
            const sub = ws.getRow(rowIndex);
            sub.getCell(4).value = `Sub-total: ${courseRows.length} student(s)`;
            sub.getCell(10).value = `Avg: ${avg.toFixed(1)}%`;
            sub.font = { bold: true };
            sub.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF7E0' },
            };
            rowIndex += 2;
          });
        });
      });
    }
    // ---------- Mode: FLAT ----------
    else {
      const ws = workbook.addWorksheet('Results');
      ws.columns = baseColumns;

      const grouped = {};
      results.forEach((r) => {
        const dept = r.department || 'Unassigned';
        const cls = r.className || 'Unassigned';
        const course = `${r.courseName} (${r.courseCode})`;
        grouped[dept] = grouped[dept] || {};
        grouped[dept][cls] = grouped[dept][cls] || {};
        grouped[dept][cls][course] = grouped[dept][cls][course] || [];
        grouped[dept][cls][course].push(r);
      });

      setHeaderRow(ws);
      let rowIndex = 2;

      Object.entries(grouped).forEach(([dept, classes]) => {
        const dRow = ws.getRow(rowIndex);
        dRow.getCell(1).value = `DEPARTMENT: ${dept}`;
        ws.mergeCells(rowIndex, 1, rowIndex, 13);
        dRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF0D3B8E' } };
        dRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5EEF7' },
        };
        rowIndex++;

        Object.entries(classes).forEach(([cls, courses]) => {
          const cRow = ws.getRow(rowIndex);
          cRow.getCell(1).value = `CLASS: ${cls}`;
          ws.mergeCells(rowIndex, 1, rowIndex, 13);
          cRow.getCell(1).font = { bold: true, size: 11 };
          cRow.getCell(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          };
          rowIndex++;

          Object.entries(courses).forEach(([courseLabel, courseRows]) => {
            const coRow = ws.getRow(rowIndex);
            coRow.getCell(1).value = `COURSE: ${courseLabel}`;
            ws.mergeCells(rowIndex, 1, rowIndex, 13);
            coRow.getCell(1).font = { bold: true, italic: true, size: 11 };
            coRow.getCell(1).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9F9F9' },
            };
            rowIndex++;

            courseRows.forEach((r) => {
              const row = ws.getRow(rowIndex);
              row.values = [
                r.department,
                r.className,
                `${r.courseName} (${r.courseCode})`,
                r.studentName,
                r.studentUsername,
                r.score,
                r.totalQuestions,
                r.correctAnswers,
                r.incorrectAnswers,
                r.percentage,
                r.timeSpent || 0,
                r.violations || 0,
                new Date(r.completedAt).toLocaleString(),
              ];
              rowIndex++;
            });

            const avg =
              courseRows.reduce((a, b) => a + (b.percentage || 0), 0) /
              courseRows.length;
            const sub = ws.getRow(rowIndex);
            sub.getCell(4).value = `Sub-total: ${courseRows.length} student(s)`;
            sub.getCell(10).value = `Avg: ${avg.toFixed(1)}%`;
            sub.font = { bold: true };
            sub.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF7E0' },
            };
            rowIndex += 2;
          });
        });
      });
    }

    const filename = `results_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export excel error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});