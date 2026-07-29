const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Ler as credenciais a partir de variável de ambiente (inserida via GitHub Secrets)
const serviceAccountKeyStr = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountKeyStr) {
  console.error("ERRO: Variável de ambiente FIREBASE_SERVICE_ACCOUNT não definida.");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKeyStr);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Formatar a data atual para dar nome ao ficheiro e pasta
const today = new Date();
const dateStr = today.toISOString().split('T')[0]; // ex: 2023-10-25
const backupDir = path.join(__dirname, '..', '..', 'backups', dateStr);

if (!fs.existsSync(backupDir)){
    fs.mkdirSync(backupDir, { recursive: true });
}

async function backupCollection(collectionName) {
  console.log(`Iniciando backup da coleção: ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  
  const data = [];
  snapshot.forEach(doc => {
    data.push({
      id: doc.id,
      ...doc.data()
    });
  });

  const filePath = path.join(backupDir, `${collectionName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Coleção ${collectionName} guardada com sucesso (${snapshot.size} documentos).`);
}

async function runBackups() {
  try {
    await backupCollection('leads');
    await backupCollection('users');
    await backupCollection('users_deleted');
    // Adicionar outras coleções se necessário
    console.log("Todos os backups concluídos com sucesso.");
    process.exit(0);
  } catch (error) {
    console.error("Erro durante o backup:", error);
    process.exit(1);
  }
}

runBackups();
