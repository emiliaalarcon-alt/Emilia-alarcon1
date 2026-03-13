import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { scheduleClassesTable, scheduleStudentsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Seed data from static export (runs once on startup)
const SEED_DATA = [
  { day: "LUNES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 1, classCode: "M1 LUN 10.30 JR", students: ["Agustin Llanquihuen","Consuelo Martinez","Cristobal Muñoz","Florencia Bastias","Joseph Vergara","Martina Bello"], teacher: "JR", course: "M1" },
  { day: "LUNES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 3, classCode: "FIS INT LUN 10.30 DE", students: ["Agustina Pérez","Aileen Lagos","Barbara Peña","Isidora Pereda","Paula Canales","Antonio Xi"], teacher: "DE", course: "FIS INT" },
  { day: "LUNES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 6, classCode: "BIO INT LUN 10.30 AV", students: ["Florencia Pooley","Francisca Leal","Francisca Torrejón","Maitte Jofre","Maria Estrada","Martina Sanchez","Rafael Briceño"], teacher: "AV", course: "BIO INT" },
  { day: "LUNES", time: "11.45 - 12.45", sede: "LAS ENCINAS", sala: 1, classCode: "M1 INT LUN 11.45 JR", students: ["Emilia Rivas","Gabriela Astorga","Javiera Ricke","Martin Schulz","Sofia Arriagada","Sofia Carrasco"], teacher: "JR", course: "M1 INT" },
  { day: "LUNES", time: "11.45 - 12.45", sede: "LAS ENCINAS", sala: 3, classCode: "FIS LUN 11.45 DE", students: ["Benjamin Diaz","Cristobal Muñoz","Hi-Jue Wu","Joseph Vergara","Maria Araneda","Sofia Gomez","Vicente Salvatici"], teacher: "DE", course: "FIS" },
  { day: "LUNES", time: "11.45 - 12.45", sede: "LAS ENCINAS", sala: 6, classCode: "BIO LUN 11.45 AV", students: ["Antonella Axtell","Antonia Herrera","Consuelo Martinez","Dilan Medina","Josefa Saba","Lucas Fehling","Matilda Hermosilla"], teacher: "AV", course: "BIO" },
  { day: "LUNES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 1, classCode: "M1 LUN 15.30 JR", students: [], teacher: "JR", course: "M1" },
  { day: "LUNES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 3, classCode: "FIS LUN 15.30 DE", students: [], teacher: "DE", course: "FIS" },
  { day: "LUNES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 4, classCode: "LN LUN 15.30 SC", students: [], teacher: "SC", course: "LN" },
  { day: "LUNES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 1, classCode: "M2 INT LUN 16.45 PF", students: ["Agustina Morales","Alvaro Colomera","Agustin Llanquihuen","Emilia Rivas","Gabriela Astorga","Javiera Ricke","Martin Schulz"], teacher: "PF", course: "M2 INT" },
  { day: "LUNES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 2, classCode: "LN LUN 16.45 SC", students: [], teacher: "SC", course: "LN" },
  { day: "LUNES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 3, classCode: "FIS INT LUN 16.45 DE", students: ["Agustina Pérez","Aileen Lagos","Barbara Peña","Isidora Pereda","Paula Canales","Antonio Xi"], teacher: "DE", course: "FIS INT" },
  { day: "LUNES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 5, classCode: "BIO INT LUN 16.45 AV", students: ["Antonella Axtell","Antonia Herrera","Consuelo Martinez","Dilan Medina","Josefa Saba","Lucas Fehling","Matilda Hermosilla"], teacher: "AV", course: "BIO INT" },
  { day: "LUNES", time: "16.45 - 17.45", sede: "INES DE SUAREZ", sala: 1, classCode: "M1 LUN 16.45 JR", students: [], teacher: "JR", course: "M1" },
  { day: "LUNES", time: "16.45 - 17.45", sede: "INES DE SUAREZ", sala: 2, classCode: "LN LUN 16.45 KG", students: [], teacher: "KG", course: "LN" },
  { day: "LUNES", time: "16.45 - 17.45", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO LUN 16.45 SS", students: [], teacher: "SS", course: "BIO" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 1, classCode: "M2 LUN 18.00 PF", students: ["Agustina Morales","Alvaro Colomera","Agustin Llanquihuen","Emilia Rivas","Gabriela Astorga","Javiera Ricke","Martin Schulz"], teacher: "PF", course: "M2" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 2, classCode: "LN LUN 18.00 SC", students: ["Agustina Gutierrez","Agustina Morales","Florencia Bastias","Francisca Torrejón","Matilde Yañez","Mia Vasconez","Vicente Caballero"], teacher: "SC", course: "LN" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 3, classCode: "FIS INT LUN 18.00 DE", students: [], teacher: "DE", course: "FIS INT" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 5, classCode: "QUI INT LUN 18.00 CA", students: [], teacher: "CA", course: "QUI INT" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 6, classCode: "HS LUN 18.00 FM", students: [], teacher: "FM", course: "HS" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 1, classCode: "M1 LUN 18.00 JR", students: [], teacher: "JR", course: "M1" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 2, classCode: "LN LUN 18.00 KG", students: [], teacher: "KG", course: "LN" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO LUN 18.00 SS", students: [], teacher: "SS", course: "BIO" },
  { day: "LUNES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 4, classCode: "FIS LUN 18.00 FM", students: [], teacher: "FM", course: "FIS" },
  { day: "LUNES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 1, classCode: "M2 LUN 19.15 PF", students: ["Emilia Huenchullan","Juan Saez","Bastian Henning","Antonella Valdes","Nicolas Jofré","Nicolas Vidal"], teacher: "PF", course: "M2" },
  { day: "LUNES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 2, classCode: "LN INT LUN 19.15 SC", students: ["Agustina Gutierrez","Agustina Morales","Florencia Bastias","Francisca Torrejón","Matilde Yañez","Mia Vasconez","Vicente Caballero"], teacher: "SC", course: "LN INT" },
  { day: "LUNES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 4, classCode: "QUI LUN 19.15 CA", students: [], teacher: "CA", course: "QUI" },
  { day: "LUNES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 6, classCode: "HS INT LUN 19.15 FM", students: [], teacher: "FM", course: "HS INT" },
  { day: "LUNES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 1, classCode: "M1 LUN 19.15 JR", students: ["Emilia Martínez","Emilio Del","Valentina Araneda","Valentina Lincolao"], teacher: "JR", course: "M1" },
  { day: "LUNES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 2, classCode: "LN LUN 19.15 KG", students: [], teacher: "KG", course: "LN" },
  { day: "LUNES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO INT LUN 19.15 SS", students: [], teacher: "SS", course: "BIO INT" },

  { day: "MARTES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MAR 10.30 PF", students: ["Agustina Morales","Alvaro Colomera","Agustín Llanquihuen"], teacher: "PF", course: "M1" },
  { day: "MARTES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 3, classCode: "QUI MAR 10.30 CA", students: ["Barbara Peña","Catalina Pritzke","Amanda Muñoz"], teacher: "CA", course: "QUI" },
  { day: "MARTES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 5, classCode: "LN MAR 10.30 SC", students: ["Fernanda Lassalle","Amaro Godoy","Agustina Gutierrez"], teacher: "SC", course: "LN" },
  { day: "MARTES", time: "10:30 - 11:30", sede: "INES DE SUAREZ", sala: 1, classCode: "M2 MAR 10.30 JR", students: ["Emilia Martínez","Emilio Del","Valentina Araneda","Valentina Lincolao"], teacher: "JR", course: "M2" },
  { day: "MARTES", time: "11.45 - 12.45", sede: "LAS ENCINAS", sala: 1, classCode: "M1 INT MAR 11.45 PF", students: [], teacher: "PF", course: "M1 INT" },
  { day: "MARTES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MAR 15.30 JR", students: [], teacher: "JR", course: "M1" },
  { day: "MARTES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 2, classCode: "LN MAR 15.30 SC", students: [], teacher: "SC", course: "LN" },
  { day: "MARTES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 3, classCode: "FIS MAR 15.30 DE", students: [], teacher: "DE", course: "FIS" },
  { day: "MARTES", time: "15.30 - 16.30", sede: "INES DE SUAREZ", sala: 2, classCode: "M1 MAR 15.30 PF", students: [], teacher: "PF", course: "M1" },
  { day: "MARTES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MAR 16.45 JR", students: ["Antonella Valdes","Bastian Henning","Emilia Huenchullan","Juan Saez","Nicolas Jofré","Nicolas Vidal","Vicente Canteros"], teacher: "JR", course: "M1" },
  { day: "MARTES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 3, classCode: "QUI MAR 16.45 CA", students: [], teacher: "CA", course: "QUI" },
  { day: "MARTES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 5, classCode: "LN MAR 16.45 SC", students: ["Agustina Gutierrez","Agustina Morales","Florencia Bastias","Francisca Torrejón","Matilde Yañez","Mia Vasconez","Vicente Caballero"], teacher: "SC", course: "LN" },
  { day: "MARTES", time: "16.45 - 17.45", sede: "INES DE SUAREZ", sala: 2, classCode: "M1 MAR 16.45 PF", students: ["Emilia Martínez","Emilio Del","Valentina Araneda","Valentina Lincolao"], teacher: "PF", course: "M1" },
  { day: "MARTES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MAR 18.00 JR", students: ["Agustin Alister","Isidora Monsalve","Isidora Buck","León Kehr","María Albornoz","Nicolas Jofré","Vicente Canteros"], teacher: "JR", course: "M1" },
  { day: "MARTES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 2, classCode: "LN MAR 18.00 SC", students: ["Catalina Cornejo","Leonor Martinez","Vicente Miranda","Isidora Arriagada","Rodrigo Moscoso","Mateo Zavala","Vicente Paslack"], teacher: "SC", course: "LN" },
  { day: "MARTES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 4, classCode: "FIS INT MAR 18.00 DE", students: [], teacher: "DE", course: "FIS INT" },
  { day: "MARTES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 1, classCode: "CS MAR 18.00 CA", students: [], teacher: "CA", course: "CS" },
  { day: "MARTES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 2, classCode: "M1 MAR 18.00 PF", students: [], teacher: "PF", course: "M1" },
  { day: "MARTES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO MAR 18.00 SS", students: [], teacher: "SS", course: "BIO" },
  { day: "MARTES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MAR 19.15 JR", students: ["Antonella Valdes","Bastian Henning","Emilia Huenchullan","Juan Saez","Nicolas Jofré","Catalina Gonzalez","Emilia Navarrete"], teacher: "JR", course: "M1" },
  { day: "MARTES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 2, classCode: "LN INT MAR 19.15 SC", students: ["Catalina Cornejo","Leonor Martinez","Vicente Miranda","Isidora Arriagada","Rodrigo Moscoso","Mateo Zavala","Vicente Paslack"], teacher: "SC", course: "LN INT" },
  { day: "MARTES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 4, classCode: "QUI INT MAR 19.15 CA", students: [], teacher: "CA", course: "QUI INT" },
  { day: "MARTES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 1, classCode: "M1 MAR 19.15 JR", students: [], teacher: "JR", course: "M1" },
  { day: "MARTES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 2, classCode: "M2 MAR 19.15 PF", students: [], teacher: "PF", course: "M2" },
  { day: "MARTES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO INT MAR 19.15 SS", students: [], teacher: "SS", course: "BIO INT" },

  { day: "MIERCOLES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MIE 10.30 JR", students: [], teacher: "JR", course: "M1" },
  { day: "MIERCOLES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 2, classCode: "LN MIE 10.30 SC", students: [], teacher: "SC", course: "LN" },
  { day: "MIERCOLES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 3, classCode: "FIS MIE 10.30 DE", students: [], teacher: "DE", course: "FIS" },
  { day: "MIERCOLES", time: "10:30 - 11:30", sede: "INES DE SUAREZ", sala: 1, classCode: "CS MIE 10.30 CA", students: [], teacher: "CA", course: "CS" },
  { day: "MIERCOLES", time: "10:30 - 11:30", sede: "INES DE SUAREZ", sala: 2, classCode: "M1 MIE 10.30 PF", students: [], teacher: "PF", course: "M1" },
  { day: "MIERCOLES", time: "10:30 - 11:30", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO MIE 10.30 SS", students: [], teacher: "SS", course: "BIO" },
  { day: "MIERCOLES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MIE 15.30 JR", students: [], teacher: "JR", course: "M1" },
  { day: "MIERCOLES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 3, classCode: "FIS MIE 15.30 DE", students: [], teacher: "DE", course: "FIS" },
  { day: "MIERCOLES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 4, classCode: "LN MIE 15.30 SC", students: [], teacher: "SC", course: "LN" },
  { day: "MIERCOLES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 1, classCode: "M1 MIE 16.45 JR", students: [], teacher: "JR", course: "M1" },
  { day: "MIERCOLES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 2, classCode: "LN MIE 16.45 SC", students: [], teacher: "SC", course: "LN" },
  { day: "MIERCOLES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 3, classCode: "QUI MIE 16.45 CA", students: [], teacher: "CA", course: "QUI" },
  { day: "MIERCOLES", time: "16.45 - 17.45", sede: "INES DE SUAREZ", sala: 3, classCode: "M1 MIE 16.45 JR", students: [], teacher: "JR", course: "M1" },
  { day: "MIERCOLES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 3, classCode: "LT MIE 18.00 CP", students: [], teacher: "CP", course: "LT" },
  { day: "MIERCOLES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 5, classCode: "BIO MIE 18.00 FM", students: ["Emilia Gomez","Karla Casanova","Javier Luders","Maximo Riquelme","Tomás Recabarren","O: Gaspar Nisin"], teacher: "FM", course: "BIO" },
  { day: "MIERCOLES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 6, classCode: "M2 MIE 18.00 JR", students: ["LEONOR MARTINEZ (CONFIRMAR)","VICENTE MIRANDA (CONFIRMAR)","TOMAS DIAZ (CONFIRMAR)","Cristobal Kind","Vicente Urrutia"], teacher: "JR", course: "M2" },
  { day: "MIERCOLES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 1, classCode: "CS MIE 18.00 CA", students: [], teacher: "CA", course: "CS" },
  { day: "MIERCOLES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 2, classCode: "M1 MIE 18.00 PF", students: [], teacher: "PF", course: "M1" },
  { day: "MIERCOLES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO MIE 18.00 SS", students: ["Josefina Henning","Leonor Alcalde","Maite bastias","Valentine Panichine"], teacher: "SS", course: "BIO" },
  { day: "MIERCOLES", time: "18.00 - 19.00", sede: "INES DE SUAREZ", sala: 5, classCode: "LN MIE 18.00 KG", students: [], teacher: "KG", course: "LN" },
  { day: "MIERCOLES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 5, classCode: "BIO MIE 19.15 FM", students: ["Emilia Gomez","Karla Casanova","Javier Luders","Maximo Riquelme","Clemente Sanhueza","Javiera Salvatici","Martina Ortiz","Leonor Alcalde"], teacher: "FM", course: "BIO" },
  { day: "MIERCOLES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 6, classCode: "M1 MIE 19.15 JR", students: ["LEONOR MARTINEZ (CONFIRMAR)","VICENTE MIRANDA (CONFIRMAR)","TOMAS DIAZ (CONFIRMAR)","Cristobal Kind","Vicente Urrutia","Valentina Panichine","Maite bastias"], teacher: "JR", course: "M1" },
  { day: "MIERCOLES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 2, classCode: "M1 MIE 19.15 PF", students: [], teacher: "PF", course: "M1" },
  { day: "MIERCOLES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 3, classCode: "BIO MIE 19.15 SS", students: ["Josefina Henning","Leonor Alcalde","Maite bastias"], teacher: "SS", course: "BIO" },
  { day: "MIERCOLES", time: "19.15 - 20.15", sede: "INES DE SUAREZ", sala: 4, classCode: "M1 MIE 19.15 KG", students: [], teacher: "KG", course: "M1" },

  { day: "JUEVES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 1, classCode: "M1 JUE 10.30 PF", students: ["Agustina Morales","Alvaro Colomera","Agustín Llanquihuen"], teacher: "PF", course: "M1" },
  { day: "JUEVES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 3, classCode: "QUI JUE 10.30 CA", students: ["Barbara Peña","Catalina Pritzke","Amanda Muñoz"], teacher: "CA", course: "QUI" },
  { day: "JUEVES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 5, classCode: "LN JUE 10.30 SC", students: ["Fernanda Lassalle","Amaro Godoy","Agustina Gutierrez"], teacher: "SC", course: "LN" },
  { day: "JUEVES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 6, classCode: "BIO JUE 10.30 AV", students: ["Florencia Pooley","Francisca Leal","Maitte Jofre","Rafael Briceño"], teacher: "AV", course: "BIO" },
  { day: "JUEVES", time: "10:30 - 11:30", sede: "INES DE SUAREZ", sala: 2, classCode: "M1 JUE 10.30 JR", students: ["Emilia Martínez","Emilio Del","Valentina Araneda","Valentina Lincolao"], teacher: "JR", course: "M1" },
  { day: "JUEVES", time: "10:30 - 11:30", sede: "INES DE SUAREZ", sala: 4, classCode: "BIO INT JUE 10.30 FM", students: ["Florencia Pooley","Francisca Leal","Maitte Jofre","María Estrada","Martina Sanchez","Rafael Briceño"], teacher: "FM", course: "BIO INT" },
  { day: "JUEVES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 2, classCode: "LN JUE 15.30 SC", students: [], teacher: "SC", course: "LN" },
  { day: "JUEVES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 3, classCode: "QUI JUE 15.30 CA", students: [], teacher: "CA", course: "QUI" },
  { day: "JUEVES", time: "15.30 - 16.30", sede: "LAS ENCINAS", sala: 4, classCode: "FIS JUE 15.30 DE", students: [], teacher: "DE", course: "FIS" },
  { day: "JUEVES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 1, classCode: "M1 JUE 16.45 JR", students: ["Antonella Valdes","Bastian Henning","Emilia Huenchullan","Juan Saez","Nicolas Jofré","Nicolas Vidal","Vicente Canteros"], teacher: "JR", course: "M1" },
  { day: "JUEVES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 3, classCode: "QUI JUE 16.45 CA", students: [], teacher: "CA", course: "QUI" },
  { day: "JUEVES", time: "16.45 - 17.45", sede: "LAS ENCINAS", sala: 6, classCode: "BIO JUE 16.45 AV", students: ["Amparo Birke","Barbara Diaz","Ignacio Valenzuela","Isidora Rivas","Joaquin Perez","José Hoyuela"], teacher: "AV", course: "BIO" },
  { day: "JUEVES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 1, classCode: "M1 JUE 18.00 PF", students: ["Agustin Alister","Isidora Monsalve","Isidora Buck","León Kehr","María Albornoz","Nicolas Jofré","Vicente Canteros"], teacher: "PF", course: "M1" },
  { day: "JUEVES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 2, classCode: "BIO JUE 18.00 AV", students: ["Amparo Birke","Antonella Espinoza","Benjamin Cid","Isidora San","Martina Valdés","Vicente Toro"], teacher: "AV", course: "BIO" },
  { day: "JUEVES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 5, classCode: "LN JUE 18.00 SC", students: ["Catalina Cornejo","Leonor Martinez","Vicente Miranda","Isidora Arriagada","Rodrigo Moscoso","Mateo Zavala","Vicente Paslack"], teacher: "SC", course: "LN" },
  { day: "JUEVES", time: "18.00 - 19.00", sede: "LAS ENCINAS", sala: 6, classCode: "MT JUE 18.00 JR", students: ["LEONOR MARTINEZ (CONFIRMAR)","VICENTE MIRANDA (CONFIRMAR)","TOMAS DIAZ (CONFIRMAR)","Cristobal Kind","Vicente Urrutia","Emilia Gomez","Karla Casanova","Jacobe henriquez","Maximo Riquelme","Tomás Recabarren"], teacher: "JR", course: "MT" },
  { day: "JUEVES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 1, classCode: "M1 JUE 19.15 PF", students: ["Antonella Valdes","Bastian Henning","Emilia Huenchullan","Juan Saez","Nicolas Jofré","Catalina Gonzalez","Emilia Navarrete"], teacher: "PF", course: "M1" },
  { day: "JUEVES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 2, classCode: "BIO JUE 19.15 AV", students: ["Amparo Birke","Camila Torres","Emilia Huenchullan","Bastian Henning","Antonella Valdes"], teacher: "AV", course: "BIO" },
  { day: "JUEVES", time: "19.15 - 20.15", sede: "LAS ENCINAS", sala: 6, classCode: "MT JUE 19.15 JR", students: ["Emilia Gomez","Karla Casanova","Elisa Gonzalez","Emilia Navarrete","Emilio Flores","Juan Carrillo","Wilfred Noel"], teacher: "JR", course: "MT" },

  { day: "VIERNES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 1, classCode: "FIS VIE 10.30 DE", students: ["Agustín Llanquihuen","Benjamin Díaz","Amaro Godoy"], teacher: "DE", course: "FIS" },
  { day: "VIERNES", time: "10:30 - 11:30", sede: "LAS ENCINAS", sala: 4, classCode: "LN VIE 10.30 SC", students: ["Agustina Morales","Francisca Torrejón","Matilde Yañez","Mia Vasconez","Vicente Caballero","Sofia Gomez"], teacher: "SC", course: "LN" },
  { day: "VIERNES", time: "10:30 - 11:30", sede: "INES DE SUAREZ", sala: 1, classCode: "LN VIE 10.30 CP", students: ["Fernanda Lassalle","Barbara Peña","Amaro Godoy"], teacher: "CP", course: "LN" },
];

async function seedIfEmpty() {
  const count = await db.$count(scheduleClassesTable);
  if (count > 0) return;

  for (const entry of SEED_DATA) {
    await db.insert(scheduleClassesTable).values({
      classCode: entry.classCode,
      day: entry.day,
      time: entry.time,
      sede: entry.sede,
      sala: entry.sala,
      teacher: entry.teacher,
      course: entry.course,
    }).onConflictDoNothing();

    for (const studentName of entry.students) {
      await db.insert(scheduleStudentsTable).values({
        classCode: entry.classCode,
        studentName,
      }).onConflictDoNothing();
    }
  }
  console.log(`[schedule] Seeded ${SEED_DATA.length} classes`);
}

seedIfEmpty().catch(console.error);

// GET /api/schedule?sede=LAS+ENCINAS
router.get("/schedule", async (req, res) => {
  try {
    const { sede } = req.query;

    const classes = await db.select().from(scheduleClassesTable);
    const students = await db.select().from(scheduleStudentsTable);

    const studentsByClass: Record<string, string[]> = {};
    for (const s of students) {
      if (!studentsByClass[s.classCode]) studentsByClass[s.classCode] = [];
      studentsByClass[s.classCode].push(s.studentName);
    }

    let result = classes.map(c => ({
      classCode: c.classCode,
      day: c.day,
      time: c.time,
      sede: c.sede,
      sala: c.sala,
      teacher: c.teacher,
      course: c.course,
      students: studentsByClass[c.classCode] ?? [],
    }));

    if (sede && typeof sede === "string") {
      result = result.filter(c => c.sede === sede);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/schedule/:classCode/students  body: { name }
router.post("/schedule/:classCode/students", async (req, res) => {
  try {
    const { classCode } = req.params;
    const { name } = req.body as { name: string };

    if (!name?.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const trimmed = name.trim();

    // Check class exists
    const cls = await db.select().from(scheduleClassesTable)
      .where(eq(scheduleClassesTable.classCode, classCode))
      .limit(1);

    if (!cls.length) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Check capacity
    const existing = await db.select().from(scheduleStudentsTable)
      .where(eq(scheduleStudentsTable.classCode, classCode));

    if (existing.length >= 7) {
      return res.status(409).json({ error: "class_full", message: "La clase ya tiene 7 alumnos" });
    }

    await db.insert(scheduleStudentsTable).values({
      classCode,
      studentName: trimmed,
    }).onConflictDoNothing();

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/schedule/:classCode/students/:name
router.delete("/schedule/:classCode/students/:name", async (req, res) => {
  try {
    const { classCode, name } = req.params;
    const studentName = decodeURIComponent(name);

    await db.delete(scheduleStudentsTable)
      .where(
        sql`${scheduleStudentsTable.classCode} = ${classCode} AND ${scheduleStudentsTable.studentName} = ${studentName}`
      );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/schedule/classes — create a new class
router.post("/schedule/classes", async (req, res) => {
  try {
    const { day, time, sede, sala, course, teacher } = req.body;
    if (!day || !time || !sede || !sala || !course || !teacher) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    const dayShortMap: Record<string, string> = {
      LUNES: "LUN", MARTES: "MAR", MIERCOLES: "MIE", JUEVES: "JUE", VIERNES: "VIE",
    };
    const dayShort = dayShortMap[day.toUpperCase()] ?? day.slice(0, 3).toUpperCase();
    const timeShort = String(time).split(/[\s\-–]+/)[0].replace(":", ".");
    const classCode = `${course.toUpperCase()} ${dayShort} ${timeShort} ${teacher.toUpperCase()}`;

    const existing = await db.select().from(scheduleClassesTable).where(eq(scheduleClassesTable.classCode, classCode));
    if (existing.length) {
      return res.status(409).json({ error: "duplicate", message: `El código ${classCode} ya existe` });
    }

    await db.insert(scheduleClassesTable).values({
      classCode,
      day: day.toUpperCase(),
      time,
      sede: sede.toUpperCase(),
      sala: Number(sala),
      teacher: teacher.toUpperCase(),
      course: course.toUpperCase(),
    });

    res.json({ ok: true, classCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/schedule/classes/:classCode — delete a class and its students
router.delete("/schedule/classes/:classCode", async (req, res) => {
  try {
    const classCode = decodeURIComponent(req.params.classCode);
    await db.delete(scheduleStudentsTable).where(eq(scheduleStudentsTable.classCode, classCode));
    await db.delete(scheduleClassesTable).where(eq(scheduleClassesTable.classCode, classCode));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/schedule/classes — delete ALL classes (reset for new year)
router.delete("/schedule/classes", async (req, res) => {
  try {
    await db.delete(scheduleStudentsTable);
    await db.delete(scheduleClassesTable);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/schedule/import — import students from Excel (.xlsx)
router.post("/schedule/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];

    // Col indices: 0=Nivel, 2=Clase, 3=Nombre, 4=Apellido
    const dataRows = rows.slice(1).filter(r => r.length >= 5);

    // Parse class code from "BIO INT LUN 10.30 AV - LAS ENCINAS - SALA 1"
    // Handle inconsistent spacing around dash
    const sedePattern = /\s*-\s*(?=LAS ENCINAS|INES DE SUAREZ)/i;
    const temuco = dataRows.filter(r => {
      const clase = String(r[2] ?? "");
      return /LAS ENCINAS|INES DE SUAREZ/i.test(clase);
    });

    // Group students by classCode
    const byCode: Map<string, string[]> = new Map();
    for (const r of temuco) {
      const clase = String(r[2]).trim();
      const parts = clase.split(sedePattern);
      const rawCode = parts[0].trim();
      // Normalize time: "16.45" stays, "16:45" → "16.45"
      const classCode = rawCode.replace(/(\d{2}):(\d{2})/g, "$1.$2");
      const nombre = String(r[3] ?? "").trim();
      const apellido = String(r[4] ?? "").trim();
      if (!nombre && !apellido) continue;
      const fullName = `${nombre} ${apellido}`.trim();
      if (!byCode.has(classCode)) byCode.set(classCode, []);
      byCode.get(classCode)!.push(fullName);
    }

    // Get all existing classes from DB
    const existingClasses = await db.select({ classCode: scheduleClassesTable.classCode })
      .from(scheduleClassesTable);
    const existingCodes = new Set(existingClasses.map(c => c.classCode));

    let updated = 0;
    let skipped = 0;
    const notFound: string[] = [];

    for (const [classCode, students] of byCode.entries()) {
      if (!existingCodes.has(classCode)) {
        notFound.push(classCode);
        skipped++;
        continue;
      }
      // Replace student list for this class
      await db.delete(scheduleStudentsTable).where(eq(scheduleStudentsTable.classCode, classCode));
      if (students.length > 0) {
        await db.insert(scheduleStudentsTable).values(
          students.map(studentName => ({ classCode, studentName }))
        );
      }
      updated++;
    }

    res.json({
      ok: true,
      updated,
      skipped,
      totalStudents: temuco.length,
      notFound: notFound.slice(0, 20),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al procesar el archivo" });
  }
});

export default router;
