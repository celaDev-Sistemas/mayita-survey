const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use('/dashboard', express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.get('/api/preguntas', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.id, p.texto, p.respuesta_correcta, c.nombre AS categoria
             FROM tbl_preguntas p
             LEFT JOIN tbl_categorias c ON c.id = p.categoria_id
             WHERE p.activa = 1
             ORDER BY p.id`
        );
        res.json(rows.map(r => ({ ...r, respuesta_correcta: !!r.respuesta_correcta })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/preguntas', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.id, p.texto, p.respuesta_correcta, p.activa, p.categoria_id, c.nombre AS categoria
            FROM tbl_preguntas p
            LEFT JOIN tbl_categorias c ON c.id = p.categoria_id
            ORDER BY p.id
        `);
        res.json(rows.map(r => ({ ...r, respuesta_correcta: !!r.respuesta_correcta, activa: !!r.activa })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departamentos', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, nombre FROM tbl_departamentos ORDER BY nombre');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/departamentos', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'Falta el nombre del departamento' });
    }
    try {
        const nombreTrim = nombre.trim();
        const [result] = await pool.query(
            'INSERT INTO tbl_departamentos (nombre) VALUES (?)',
            [nombreTrim]
        );
        res.status(201).json({ id: result.insertId, nombre: nombreTrim });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un departamento con ese nombre.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/departamentos/:id', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'Falta el nombre del departamento' });
    }
    try {
        const [result] = await pool.query(
            'UPDATE tbl_departamentos SET nombre = ? WHERE id = ?',
            [nombre.trim(), req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Departamento no encontrado' });
        }
        res.json({ ok: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un departamento con ese nombre.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/departamentos/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM tbl_departamentos WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Departamento no encontrado' });
        }
        res.json({ ok: true });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({ error: 'No se puede borrar: ya tiene respuestas registradas en la bitácora.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categorias', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, nombre FROM tbl_categorias ORDER BY nombre');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categorias', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'Falta el nombre de la categoria' });
    }
    try {
        const nombreTrim = nombre.trim();
        const [result] = await pool.query(
            'INSERT INTO tbl_categorias (nombre) VALUES (?)',
            [nombreTrim]
        );
        res.status(201).json({ id: result.insertId, nombre: nombreTrim });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/preguntas', async (req, res) => {
    const { texto, categoria_id, activa, respuesta_correcta } = req.body;
    if (!texto || !texto.trim()) {
        return res.status(400).json({ error: 'Falta el texto de la pregunta' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO tbl_preguntas (texto, categoria_id, activa, respuesta_correcta) VALUES (?, ?, ?, ?)',
            [texto.trim(), categoria_id || null, activa !== false, respuesta_correcta !== false]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/preguntas/:id', async (req, res) => {
    const { texto, categoria_id, activa, respuesta_correcta } = req.body;
    if (!texto || !texto.trim()) {
        return res.status(400).json({ error: 'Falta el texto de la pregunta' });
    }
    try {
        const [result] = await pool.query(
            'UPDATE tbl_preguntas SET texto = ?, categoria_id = ?, activa = ?, respuesta_correcta = ? WHERE id = ?',
            [texto.trim(), categoria_id || null, activa !== false, respuesta_correcta !== false, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/preguntas/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM tbl_preguntas WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }
        res.json({ ok: true });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({ error: 'No se puede borrar: ya tiene respuestas registradas en la bitácora. Desactívala en su lugar.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/respuestas', async (req, res) => {
    const { pregunta_id, sesion_id, respuesta, nivel_en_momento, departamento_id } = req.body;
    if (!pregunta_id || !sesion_id || typeof respuesta !== 'boolean') {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    try {
        const [preguntaRows] = await pool.query(
            'SELECT respuesta_correcta FROM tbl_preguntas WHERE id = ?',
            [pregunta_id]
        );
        if (preguntaRows.length === 0) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }
        const correcta = respuesta === !!preguntaRows[0].respuesta_correcta;
        const resultado = correcta ? 'completo' : 'recortado';
        await pool.query(
            `INSERT INTO tbl_log (pregunta_id, sesion_id, departamento_id, respuesta, correcta, nivel_en_momento, resultado)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [pregunta_id, sesion_id, departamento_id || null, respuesta, correcta, nivel_en_momento || null, resultado]
        );
        res.status(201).json({ ok: true, correcta: correcta });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const [
            [totalRows],
            [resultadosRows],
            [preguntasRows],
            [porDiaRows],
            [aciertoRows],
            [departamentosRows]
        ] = await Promise.all([
            pool.query('SELECT COUNT(DISTINCT sesion_id) AS total FROM tbl_log'),
            pool.query(`
                WITH sesiones AS (
                    SELECT sesion_id,
                           COUNT(*) AS respondidas,
                           SUM(CASE WHEN correcta = 0 THEN 1 ELSE 0 END) AS incorrectas
                    FROM tbl_log
                    GROUP BY sesion_id
                )
                SELECT
                    CASE
                        WHEN respondidas < 10 THEN 'abandonada'
                        WHEN incorrectas >= 4 THEN 'perdida'
                        ELSE 'ganada'
                    END AS resultado,
                    COUNT(*) AS total
                FROM sesiones
                GROUP BY 1
            `),
            pool.query(`
                SELECT p.id, p.texto,
                       SUM(CASE WHEN l.correcta = 1 THEN 1 ELSE 0 END) AS correctas,
                       SUM(CASE WHEN l.correcta = 0 THEN 1 ELSE 0 END) AS incorrectas
                FROM tbl_preguntas p
                LEFT JOIN tbl_log l ON l.pregunta_id = p.id
                GROUP BY p.id, p.texto
                ORDER BY p.id
            `),
            pool.query(`
                SELECT DATE_FORMAT(creado_en, '%Y-%m-%d') AS dia,
                       COUNT(DISTINCT sesion_id) AS partidas
                FROM tbl_log
                GROUP BY 1
                ORDER BY 1
            `),
            pool.query(`
                SELECT COALESCE(SUM(CASE WHEN correcta = 1 THEN 1 ELSE 0 END), 0) AS correctas,
                       COUNT(*) AS total
                FROM tbl_log
            `),
            pool.query(`
                SELECT d.id, d.nombre,
                       SUM(CASE WHEN l.correcta = 1 THEN 1 ELSE 0 END) AS correctas,
                       SUM(CASE WHEN l.correcta = 0 THEN 1 ELSE 0 END) AS incorrectas
                FROM tbl_departamentos d
                LEFT JOIN tbl_log l ON l.departamento_id = d.id
                GROUP BY d.id, d.nombre
                ORDER BY d.nombre
            `)
        ]);

        const resultados = { ganada: 0, perdida: 0, abandonada: 0 };
        resultadosRows.forEach((row) => {
            resultados[row.resultado] = Number(row.total);
        });

        res.json({
            totalPartidas: Number(totalRows[0].total) || 0,
            resultados,
            preguntas: preguntasRows,
            porDia: porDiaRows,
            acierto: aciertoRows[0],
            departamentos: departamentosRows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
