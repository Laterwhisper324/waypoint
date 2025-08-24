const fs = require('fs');
const mysql = require('mysql2');

// Configure sua conexão
const connection = mysql.createConnection({
    host: '127.0.0.1', // Corrigido aqui
    user: 'root',
    password: '12345678',
    database: 'waypoint_bd',
    port: 3306
});

fs.readFile('cadastros-feitos', 'utf8', (err, data) => {
    if (err) throw err;
    const linhas = data.split('\n');
    let inseridos = 0;
    linhas.forEach((linha, idx) => {
        const partes = linha.split('|').map(p => p.trim());
        if (partes.length === 3) {
            const nome = partes[0].replace('Nome: ', '').trim();
            const email = partes[1].replace('Email: ', '').trim();
            const senha = partes[2].replace('Senha: ', '').trim();

            if (nome && email && senha) {
                connection.query(
                    'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
                    [nome, email, senha],
                    (err) => {
                        if (err) {
                            console.log(`Erro ao inserir ${email}:`, err.sqlMessage);
                        } else {
                            console.log(`Inserido: ${email}`);
                        }
                        inseridos++;
                        if (inseridos === linhas.length) {
                            connection.end();
                        }
                    }
                );
            } else {
                inseridos++;
                if (inseridos === linhas.length) {
                    connection.end();
                }
            }
        } else {
            inseridos++;
            if (inseridos === linhas.length) {
                connection.end();
            }
        }
    });
});