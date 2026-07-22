// Test de fecha excel a ISO
function testDate(fechaNum) {
    console.log("Testeando numero serial:", fechaNum);
    
    // Método actual en el código
    const excelEpochLocal = new Date(1899, 11, 30);
    const dateObjLocal = new Date(excelEpochLocal.getTime() + Number(fechaNum) * 86400000);
    const fechaISO = dateObjLocal.toISOString().split('T')[0];
    
    console.log("Metodo actual:", fechaISO, "(", dateObjLocal.toString(), ")");
    
    // Método usando UTC
    const excelEpochUTC = new Date(Date.UTC(1899, 11, 30));
    // Corrección para sumar los milisegundos directamente en UTC
    const dateObjUTC = new Date(excelEpochUTC.getTime() + Number(fechaNum) * 86400000);
    const fechaUTC = dateObjUTC.toISOString().split('T')[0];
    
    console.log("Metodo UTC:", fechaUTC, "(", dateObjUTC.toUTCString(), ")");
    
    // Para redondear posibles errores de coma flotante por milisegundos ciegos
    const dateObjRound = new Date(Math.round((excelEpochUTC.getTime() + Number(fechaNum) * 86400000) / 1000) * 1000);
    console.log("Metodo UTC (redondeado):", dateObjRound.toISOString().split('T')[0]);
}

testDate(45305); // Ej. Enero 2024
testDate(45305.5); // Probando con hora
