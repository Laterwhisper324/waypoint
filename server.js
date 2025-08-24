const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const uploadDir = path.join(__dirname, 'user_icons');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, req.body.email.replace(/[^a-zA-Z0-9]/g, '_') + ext);
    }
});
const upload = multer({ storage });

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Rota para upload de imagem de usuário
app.post('/upload_icon', upload.single('icon'), (req, res) => {
    if (!req.file || !req.body.email) {
        return res.status(400).send('Faltando arquivo ou email.');
    }
    res.send({ sucesso: true, filename: req.file.filename });
});

// Rota para buscar imagem do usuário
app.get('/user_icon/:email', (req, res) => {
    const email = req.params.email.replace(/[^a-zA-Z0-9]/g, '_');
    const files = fs.readdirSync(uploadDir);
    const found = files.find(f => f.startsWith(email));
    if (found) {
        res.sendFile(path.join(uploadDir, found));
    } else {
        res.sendFile(path.join(__dirname, 'icone.png')); // Usa seu icone.png como padrão
    }
});

// Rota para receber o cadastro
app.post('/cadastro', (req, res) => {
    const { nome, email, senha, confirmar } = req.body;
    const filePath = path.join(__dirname, 'cadastros-feitos');

    // Verifica se todos os campos estão preenchidos
    if (!nome || !email || !senha || !confirmar) {
        return res.status(400).send('Preencha todos os campos.');
    }

    // Verifica se o e-mail é válido (contém @)
    if (!email.includes('@')) {
        return res.status(400).send('E-mail inválido.');
    }

    // Verifica se as senhas são iguais
    if (senha !== confirmar) {
        return res.status(400).send('As senhas não coincidem.');
    }

    // Verifica se a senha é fraca (exemplo: menos de 6 caracteres)
    if (senha.length < 6) {
        return res.status(400).send('Senha fraca. Use pelo menos 6 caracteres.');
    }

    // Lê o arquivo de cadastros para verificar e-mail e senha repetidos
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (!err && data) {
            const linhas = data.split('\n');
            for (const linha of linhas) {
                if (linha.includes(`Email: ${email} `)) {
                    return res.status(400).send('E-mail já usado.');
                }
                // Opcional: verifica se a senha já foi usada (não recomendado em produção)
                if (linha.includes(`Senha: ${senha}`)) {
                    return res.status(400).send('Senha fraca ou já utilizada. Escolha outra senha.');
                }
            }
        }

        // Se passou por todas as validações, salva o cadastro
        const linha = `Nome: ${nome} | Email: ${email} | Senha: ${senha}\n`;
        fs.appendFile(filePath, linha, (err) => {
            if (err) {
                return res.status(500).send('Erro ao salvar cadastro.');
            }
            res.send('<h2>Cadastro realizado com sucesso!</h2><a href="cadastro.html">Voltar</a>');
        });
    });
});

// Rota para login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const filePath = path.join(__dirname, 'cadastros-feitos');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err || !data) {
            return res.status(500).send({ sucesso: false, mensagem: 'Erro ao acessar cadastros.' });
        }
        const linhas = data.split('\n');
        for (const linha of linhas) {
            // Procura por email e senha na linha
            const partes = linha.split('|').map(p => p.trim());
            if (partes.length === 3) {
                const nomeArq = partes[0].replace('Nome:', '').trim();
                const emailArq = partes[1].replace('Email:', '').trim();
                const senhaArq = partes[2].replace('Senha:', '').trim();
                if (emailArq === email && senhaArq === senha) {
                    return res.send({ sucesso: true, nome: nomeArq });
                }
            }
        }
        res.send({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});