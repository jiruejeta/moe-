const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const Result = require('../models/Result');
const { verifyToken, isAdmin } = require('../middleware/auth');

// =========================================================
// GET /api/results
// =========================================================
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.className) filter.className = req.query.className;
    if (req.query.courseCode) filter.courseCode = req.query.courseCode;

    const results = await Result.find(filter).sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    console.error('GET results error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// GET /api/results/department/:department
// =========================================================
router.get('/department/:department', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find({ department: req.params.department })
      .sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// GET /api/results/class/:className
// =========================================================
router.get('/class/:className', verifyToken, isAdmin, async (req, res) => {
  try {
    const results = await Result.find({ className: req.params.className })
      .sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// GET /api/results/student/:studentId
// =========================================================
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.params.studentId })
      .sort({ completedAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =========================================================
// GET /api/results/export/excel
//   ?mode=by-course (default) | by-class | flat
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

    const sanitize = (s) =>
      (s || 'Sheet').replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);

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

    const styleHeader = (ws) => {
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D3B8E' },
      };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 13 },
      };
    };

    const pushStudentRow = (ws, r, rowIndex) => {
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
      return rowIndex + 1;
    };

    const pushBanner = (ws, text, rowIndex, opts = {}) => {
      const row = ws.getRow(rowIndex);
      row.getCell(1).value = text;
      ws.mergeCells(rowIndex, 1, rowIndex, 13);
      row.getCell(1).font = {
        bold: true,
        size: opts.size || 11,
        italic: !!opts.italic,
        color: opts.color ? { argb: opts.color } : undefined,
      };
      if (opts.fill) {
        row.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: opts.fill },
        };
      }
      return rowIndex + 1;
    };

    const pushSubtotal = (ws, count, avg, rowIndex) => {
      const row = ws.getRow(rowIndex);
      row.getCell(4).value = `Sub-total: ${count} student(s)`;
      row.getCell(10).value = `Avg: ${avg.toFixed(1)}%`;
      row.font = { bold: true };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF7E0' },
      };
      return rowIndex + 2;
    };

    const avgOf = (rows) =>
      rows.reduce((a, b) => a + (b.percentage || 0), 0) / rows.length;

    if (mode !== 'by-class' && mode !== 'flat') {
      // BY COURSE (default)
      const byCourse = {};
      results.forEach((r) => {
        const key = `${r.courseName} (${r.courseCode})`;
        byCourse[key] = byCourse[key] || [];
        byCourse[key].push(r);
      });

      Object.entries(byCourse).forEach(([courseLabel, rows]) => {
        const ws = workbook.addWorksheet(sanitize(courseLabel));
        ws.columns = baseColumns;
        styleHeader(ws);

        const grouped = {};
        rows.forEach((r) => {
          const dept = r.department || 'Unassigned';
          const cls = r.className || 'Unassigned';
          grouped[dept] = grouped[dept] || {};
          grouped[dept][cls] = grouped[dept][cls] || [];
          grouped[dept][cls].push(r);
        });

        let rowIndex = 2;
        Object.entries(grouped).forEach(([dept, classes]) => {
          rowIndex = pushBanner(ws, `DEPARTMENT: ${dept}`, rowIndex, {
            size: 12,
            color: 'FF0D3B8E',
            fill: 'FFE5EEF7',
          });
          Object.entries(classes).forEach(([cls, classRows]) => {
            rowIndex = pushBanner(ws, `CLASS: ${cls}`, rowIndex, {
              size: 11,
              fill: 'FFF2F2F2',
            });
            classRows.forEach((r) => {
              rowIndex = pushStudentRow(ws, r, rowIndex);
            });
            rowIndex = pushSubtotal(ws, classRows.length, avgOf(classRows), rowIndex);
          });
        });
      });
    } else if (mode === 'by-class') {
      const byClass = {};
      results.forEach((r) => {
        const key = r.className || 'Unassigned';
        byClass[key] = byClass[key] || [];
        byClass[key].push(r);
      });

      Object.entries(byClass).forEach(([cls, rows]) => {
        const ws = workbook.addWorksheet(sanitize(cls));
        ws.columns = baseColumns;
        styleHeader(ws);

        const grouped = {};
        rows.forEach((r) => {
          const dept = r.department || 'Unassigned';
          const course = `${r.courseName} (${r.courseCode})`;
          grouped[dept] = grouped[dept] || {};
          grouped[dept][course] = grouped[dept][course] || [];
          grouped[dept][course].push(r);
        });

        let rowIndex = 2;
        Object.entries(grouped).forEach(([dept, courses]) => {
          rowIndex = pushBanner(ws, `DEPARTMENT: ${dept}`, rowIndex, {
            size: 12,
            color: 'FF0D3B8E',
            fill: 'FFE5EEF7',
          });
          Object.entries(courses).forEach(([courseLabel, courseRows]) => {
            rowIndex = pushBanner(ws, `COURSE: ${courseLabel}`, rowIndex, {
              size: 11,
              italic: true,
              fill: 'FFF9F9F9',
            });
            courseRows.forEach((r) => {
              rowIndex = pushStudentRow(ws, r, rowIndex);
            });
            rowIndex = pushSubtotal(ws, courseRows.length, avgOf(courseRows), rowIndex);
          });
        });
      });
    } else {
      const ws = workbook.addWorksheet('Results');
      ws.columns = baseColumns;
      styleHeader(ws);

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

      let rowIndex = 2;
      Object.entries(grouped).forEach(([dept, classes]) => {
        rowIndex = pushBanner(ws, `DEPARTMENT: ${dept}`, rowIndex, {
          size: 12,
          color: 'FF0D3B8E',
          fill: 'FFE5EEF7',
        });
        Object.entries(classes).forEach(([cls, courses]) => {
          rowIndex = pushBanner(ws, `CLASS: ${cls}`, rowIndex, {
            size: 11,
            fill: 'FFF2F2F2',
          });
          Object.entries(courses).forEach(([courseLabel, courseRows]) => {
            rowIndex = pushBanner(ws, `COURSE: ${courseLabel}`, rowIndex, {
              size: 11,
              italic: true,
              fill: 'FFF9F9F9',
            });
            courseRows.forEach((r) => {
              rowIndex = pushStudentRow(ws, r, rowIndex);
            });
            rowIndex = pushSubtotal(ws, courseRows.length, avgOf(courseRows), rowIndex);
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

// =========================================================
// GET /api/results/:id  (must be last)
// =========================================================
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;