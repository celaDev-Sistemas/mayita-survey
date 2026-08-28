CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS preguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT,
    texto TEXT NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respuesta_correcta BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pregunta_id INT NOT NULL,
    sesion_id CHAR(36) NOT NULL,
    respuesta BOOLEAN NOT NULL,
    nivel_en_momento INT,
    resultado VARCHAR(20) CHECK (resultado IN ('completo', 'recortado')),
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    correcta BOOLEAN,
    departamento_id INT,
    FOREIGN KEY (pregunta_id) REFERENCES preguntas(id),
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
) ENGINE=InnoDB;

INSERT IGNORE INTO categorias (nombre)
VALUES ('general');

INSERT IGNORE INTO departamentos (nombre)
VALUES ('Sistemas'), ('Finanzas'), ('Recursos Humanos');

INSERT INTO preguntas (categoria_id, texto, respuesta_correcta)
SELECT 1, texto, correcta
FROM (
    SELECT '¿Grupo Celaque fue fundado en el año 2001?' AS texto, TRUE AS correcta
    UNION ALL SELECT '¿La principal actividad de Grupo Celaque es la fabricación de teléfonos celulares?', FALSE
    UNION ALL SELECT '¿Constructora Celaque participa en proyectos de carreteras y puentes en Honduras?', TRUE
    UNION ALL SELECT '¿La sede principal de Grupo Celaque está ubicada en Tegucigalpa?', TRUE
    UNION ALL SELECT '¿Grupo Celaque únicamente construye viviendas y no realiza obras de infraestructura?', FALSE
    UNION ALL SELECT '¿Concretos y Agregados Celaque produce concreto y materiales para construcción?', TRUE
    UNION ALL SELECT '¿Grupo Celaque es una empresa originaria de Honduras?', TRUE
    UNION ALL SELECT '¿Motores y Repuestos Celaque se dedica exclusivamente a vender ropa y calzado?', FALSE
    UNION ALL SELECT '¿Grupo Celaque desarrolla proyectos inmobiliarios además de obras de construcción?', TRUE
    UNION ALL SELECT '¿Grupo Celaque fue fundado en el año 1995?', FALSE
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM preguntas);
