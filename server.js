const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Email transporter setup (Gmail example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-email-password'
    }
});

// Appointment booking route
app.post('/api/book-appointment', (req, res) => {
    const { patientEmail, doctorEmail, doctorName, timeSlot } = req.body;
    
    if (!patientEmail || !doctorEmail || !doctorName || !timeSlot) {
        console.error('Missing fields:', { patientEmail, doctorEmail, doctorName, timeSlot });
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const patientMailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: patientEmail,
        subject: 'Appointment Confirmation',
        text: `Your appointment with ${doctorName} at ${timeSlot} has been confirmed.`
    };
    
    const doctorMailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: doctorEmail,
        subject: 'New Appointment Booking',
        text: `You have a new appointment at ${timeSlot} with patient ${patientEmail}.`
    };
    
    Promise.all([
        new Promise((resolve, reject) => {
            transporter.sendMail(patientMailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending patient email:', error);
                    reject(error);
                } else {
                    console.log('Patient email sent:', info.response);
                    resolve(info);
                }
            });
        }),
        new Promise((resolve, reject) => {
            transporter.sendMail(doctorMailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending doctor email:', error);
                    reject(error);
                } else {
                    console.log('Doctor email sent:', info.response);
                    resolve(info);
                }
            });
        })
    ])
        .then(() => {
            res.json({ success: true, message: 'Appointment booked successfully' });
        })
        .catch(error => {
            console.error('Error sending emails:', error);
            res.status(500).json({ success: false, error: 'Failed to send confirmation emails' });
        });
});

// Simple in-memory conversation state
let conversationState = {
    stage: 0,
    userName: null,
    userEmail: null,
    selectedSpecialty: null,
    selectedDoctor: null,
    isMedicalInquiry: false
};

// Email validation function
function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
}

// Sanitize string for safe use in onclick
function sanitizeString(str) {
    return str.replace(/"/g, '\\"').replace(/\n/g, '');
}

// Normalize string for comparison
function normalizeString(str) {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Normalize time slot specifically
function normalizeTimeSlot(str) {
    if (!str) return '';
    return str.trim().replace(/[^0-9: AMPM]/gi, '').replace(/\s+/g, ' ');
}

// Appointment-related keywords/phrases
const appointmentKeywords = [
    'book appointment', 'schedule appointment', 'make appointment',
    'book a visit', 'schedule a visit', 'arrange appointment',
    'need to see a doctor', 'want to see a doctor', 'book with doctor',
    'schedule with doctor', 'appointment with doctor', 'see a specialist',
    'visit a doctor', 'consult a doctor', 'meet a doctor'
];

// Greeting keywords
const greetingKeywords = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon',
    'good evening', 'howdy', 'yo', 'hola'
];

// Check if message is a greeting
function isGreeting(message) {
    const normalizedMessage = normalizeString(message);
    return greetingKeywords.some(keyword => normalizedMessage.includes(keyword));
}

// Check if message indicates intent to book an appointment
function isAppointmentRelated(message) {
    const normalizedMessage = normalizeString(message);
    return appointmentKeywords.some(keyword => normalizedMessage.includes(keyword));
}

// Expanded medical-related keywords
const medicalKeywords = [
    'symptom', 'disease', 'condition', 'treatment', 'medication', 'diagnosis',
    'pain', 'fever', 'infection', 'injury', 'surgery', 'therapy', 'health',
    'illness', 'doctor', 'hospital', 'medicine', 'prescription', 'allergy',
    'chronic', 'acute', 'virus', 'bacteria', 'cancer', 'diabetes', 'heart',
    'blood', 'pressure', 'stroke', 'asthma', 'arthritis', 'mental', 'depression',
    'anxiety', 'vaccine', 'immune', 'flu', 'cold', 'cough', 'headache', 'migraine',
    'nausea', 'fatigue', 'rash', 'swelling', 'inflammation', 'bleeding', 'bruise',
    'fracture', 'sprain', 'strain', 'tumor', 'ulcer', 'seizure', 'dizziness',
    'shortness', 'breath', 'chest', 'abdomen', 'kidney', 'liver', 'lung',
    'thyroid', 'hormone', 'insulin', 'cholesterol', 'allergic', 'reaction',
    'antibiotics', 'antiviral', 'painkiller', 'syringe', 'injection', 'scan',
    'xray', 'mri', 'ultrasound', 'biopsy', 'chemotherapy', 'radiation', 'dialysis',
    'transplant', 'immune', 'system', 'autoimmune', 'rheumatoid', 'psoriasis',
    'eczema', 'hypertension', 'hypotension', 'anemia', 'leukemia', 'lymphoma',
    'epilepsy', 'parkinson', 'alzheimer', 'concussion', 'obesity', 'malnutrition',
    'vitamin', 'deficiency', 'legs pain', 'hand pain', 'back pain', 'knee pain',
    'eyes related problem', 'eye pain', 'vision loss', 'blurred vision', 'glaucoma',
    'cataract', 'conjunctivitis', 'dry eyes', 'retina', 'cornea', 'neck pain',
    'shoulder pain', 'elbow pain', 'wrist pain', 'hip pain', 'ankle pain',
    'foot pain', 'joint pain', 'muscle pain', 'numbness', 'tingling', 'cramp',
    'spasm', 'stiffness', 'sciatica', 'tendonitis', 'bursitis', 'gout',
    'osteoporosis', 'scoliosis', 'hernia', 'disc slip', 'sinus', 'sinusitis',
    'sore throat', 'tonsillitis', 'laryngitis', 'bronchitis', 'pneumonia',
    'tuberculosis', 'emphysema', 'copd', 'gastritis', 'acid reflux', 'gerd',
    'constipation', 'diarrhea', 'ibs', 'crohn', 'colitis', 'appendicitis',
    'gallstone', 'pancreatitis', 'hepatitis', 'cirrhosis', 'bladder', 'uti',
    'kidney stone', 'prostate', 'incontinence', 'menopause', 'pms', 'endometriosis',
    'fibroid', 'infertility', 'erectile', 'dysfunction', 'std', 'hiv', 'herpes',
    'hpv', 'syphilis', 'gonorrhea', 'chlamydia', 'acne', 'rosacea', 'dandruff',
    'alopecia', 'hives', 'warts', 'mole', 'melanoma', 'basal cell', 'squamous',
    'psoriatic', 'lupus', 'scleroderma', 'vitiligo', 'insomnia', 'sleep apnea',
    'narcolepsy', 'restless legs', 'phobia', 'ocd', 'ptsd', 'bipolar', 'schizophrenia',
    'addiction', 'detox', 'rehab', 'anorexia', 'bulimia', 'binge eating', 'vertigo',
    'tinnitus', 'hearing loss', 'ear infection', 'meningitis', 'encephalitis',
    'hydrocephalus', 'aneurysm', 'hemorrhage', 'clot', 'angina', 'arrhythmia',
    'cardiomyopathy', 'stent', 'bypass', 'pacemaker', 'endoscopy', 'colonoscopy',
    'mammogram', 'pap smear', 'prostate exam', 'blood test', 'urine test',
    'stool test', 'ecg', 'eeg', 'ct scan', 'pet scan', 'ventilator', 'oxygen therapy'
];

// Check if message contains medical-related keywords
function isMedicalRelated(message) {
    const normalizedMessage = normalizeString(message);
    console.log('Checking medical keywords in:', normalizedMessage);
    const matchedKeywords = medicalKeywords.filter(keyword => normalizedMessage.includes(keyword));
    console.log('Matched medical keywords:', matchedKeywords);
    return matchedKeywords.length > 0;
}

// Grok API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama3-70b-8192";

// Function to query Grok API
async function queryGrokAPI(question) {
    try {
        const response = await axios.post(GROQ_API_URL, {
            model: GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a medical information assistant. Provide accurate and concise answers to medical-related questions, limiting responses to approximately 10 lines. Do not provide personal medical advice or diagnoses, but offer general information. If the question is unclear or not medical-related, politely redirect the user to ask a relevant medical question."
                },
                {
                    role: "user",
                    content: question
                }
            ],
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Grok API response:', response.data.choices[0].message.content.trim());
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Grok API error:', error.message, error.response ? error.response.data : '');
        return "Sorry, I couldn't process your medical question at this time. Please try again or ask another question.";
    }
}

// List of specialties (keep original case for display)
const specialties = [
    'Cardiology', 'Neurology', 'Pulmonology', 'Gastroenterology',
    'Nephrology', 'Endocrinology', 'Oncology', 'Hematology',
    'Dermatology', 'Psychiatry'
];

// Normalized specialties for comparison
const normalizedSpecialties = specialties.map(s => normalizeString(s));

// List of doctors per specialty with fictional emails
const doctors = {
    'Cardiology': [
        { name: 'Dr. Somasekar', email: 'somasekar@example.com' },
        { name: 'Dr. Poovarasan', email: 'poovarasan@example.com' }
    ],
    'Neurology': [
        { name: 'Dr. Anjali Sharma', email: 'anjali.sharma@example.com' },
        { name: 'Dr. Vikram Patel', email: 'vikram.patel@example.com' }
    ],
    'Pulmonology': [
        { name: 'Dr. Priya Menon', email: 'priya.menon@example.com' },
        { name: 'Dr. Sanjay Gupta', email: 'sanjay.gupta@example.com' }
    ],
    'Gastroenterology': [
        { name: 'Dr. Rajesh Nair', email: 'rajesh.nair@example.com' },
        { name: 'Dr. Meena Iyer', email: 'meena.iyer@example.com' }
    ],
    'Nephrology': [
        { name: 'Dr. Arjun Reddy', email: 'arjun.reddy@example.com' },
        { name: 'Dr. Lakshmi Rao', email: 'lakshmi.rao@example.com' }
    ],
    'Endocrinology': [
        { name: 'Dr. Kavita Desai', email: 'kavita.desai@example.com' },
        { name: 'Dr. Mohan Kumar', email: 'mohan.kumar@example.com' }
    ],
    'Oncology': [
        { name: 'Dr. Siddharth Bose', email: 'siddharth.bose@example.com' },
        { name: 'Dr. Nisha Verma', email: 'nisha.verma@example.com' }
    ],
    'Hematology': [
        { name: 'Dr. Anil Kapoor', email: 'anil.kapoor@example.com' },
        { name: 'Dr. Sunita Pillai', email: 'sunita.pillai@example.com' }
    ],
    'Dermatology': [
        { name: 'Dr. Riya Sen', email: 'riya.sen@example.com' },
        { name: 'Dr. Amitabh Das', email: 'amitabh.das@example.com' }
    ],
    'Psychiatry': [
        { name: 'Dr. Shalini Mehta', email: 'shalini.mehta@example.com' },
        { name: 'Dr. Rohan Joshi', email: 'rohan.joshi@example.com' }
    ]
};

// Available time slots
const timeSlots = ['10:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

// Chatbot API
app.post('/api/chat', async (req, res) => {
    console.log('Raw request body:', req.body);
    const { message } = req.body;
    console.log('Received message:', message, 'Current stage:', conversationState.stage, 'Conversation state:', conversationState);
    
    if (!message && message !== 'start' && message !== 'end') {
        console.error('No message provided');
        return res.status(400).json({ error: 'No message provided' });
    }

    // Reset conversation state on 'start' or 'end'
    if (message === 'start' || message === 'end') {
        conversationState = {
            stage: 0,
            userName: null,
            userEmail: null,
            selectedSpecialty: null,
            selectedDoctor: null,
            isMedicalInquiry: false
        };
        console.log('Conversation reset:', conversationState);
        if (message === 'end') {
            return res.json({
                reply: '',
                buttons: [],
                disableInput: false,
                hideInput: false,
                isMedicalInquiry: false,
                silent: true
            });
        }
    }

    let reply = '';
    let buttons = [];
    let disableInput = false;
    let hideInput = false;
    let isMedicalInquiry = conversationState.isMedicalInquiry;

    try {
        // Check for greetings first
        if (message !== 'start' && message !== 'end' && message !== 'return_back' && isGreeting(message)) {
            console.log('Greeting detected:', message);
            reply = "Hello! How can I assist you today?";
            if (conversationState.stage === 0 || conversationState.stage === 1) {
                reply = "Hi there! May I know your name?";
                conversationState.stage = 2;
            } else if (conversationState.stage === 2) {
                reply = "Hello! Please provide your name.";
            } else if (conversationState.stage === 3) {
                reply = `Hi ${conversationState.userName}! Please share your email ID.`;
            } else if (conversationState.stage === 4) {
                reply = "Greetings! Do you want to book an appointment or ask a medical-related question?";
                buttons = [
                    { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                    { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                    { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                ];
                hideInput = true;
            } else if (conversationState.stage === 5) {
                reply = "Hi! Please select a specialty or return back:";
                buttons = [
                    ...specialties.map(specialty => ({
                        text: specialty,
                        class: 'specialty-button',
                        onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                    })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 6) {
                reply = `Hello! Please select a doctor for ${conversationState.selectedSpecialty} or return back:`;
                buttons = [
                    ...doctors[conversationState.selectedSpecialty].map(doctor => ({
                        text: doctor.name,
                        class: 'specialty-button',
                        onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                    })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 7) {
                reply = `Hi! Please select a time slot for ${conversationState.selectedDoctor} or return back:`;
                buttons = [
                    ...timeSlots.map(timeSlot => ({
                        text: timeSlot,
                        class: 'time-slot-button',
                        onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(conversationState.selectedDoctor)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                    })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 8) {
                reply = "Hello! Your appointment is confirmed. To book another or ask a question, please start over.";
                buttons = [];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 9) {
                reply = "Hello! I'm here to help with your medical questions. Please ask something like 'What causes leg pain?' or select 'Return Back'.";
                buttons = [
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = false;
                hideInput = false;
                isMedicalInquiry = true;
            }
        }
        // Check for appointment intent
        else if (message !== 'start' && message !== 'end' && message !== 'return_back' && isAppointmentRelated(message)) {
            console.log('Appointment intent detected:', message);
            if (!conversationState.userName) {
                reply = "May I know your name?";
                conversationState.stage = 2;
            } else if (!conversationState.userEmail) {
                reply = `Hi ${conversationState.userName}! Can you please send your email ID for communication?`;
                conversationState.stage = 3;
            } else {
                reply = "Please select a specialty or return back:";
                buttons = [
                    ...specialties.map(specialty => ({
                        text: specialty,
                        class: 'specialty-button',
                        onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                    })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
                conversationState.stage = 5;
                conversationState.isMedicalInquiry = false;
            }
        } else {
            // Existing stage-based logic
            switch (conversationState.stage) {
                case 0:
                    reply = "How can I assist you today?";
                    conversationState.stage = 1;
                    break;

                case 1:
                    reply = "May I know your name?";
                    conversationState.stage = 2;
                    break;

                case 2:
                    conversationState.userName = message.trim();
                    reply = `Hi ${conversationState.userName}! Can you please send your email ID for communication?`;
                    conversationState.stage = 3;
                    break;

                case 3:
                    if (isValidEmail(message.trim())) {
                        conversationState.userEmail = message.trim();
                        reply = "Thank you for sharing the details. Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                        conversationState.stage = 4;
                    } else {
                        reply = "Invalid email ID, please try again.";
                    }
                    break;

                case 4:
                    if (message.toLowerCase() === 'yes') {
                        reply = "Please select a specialty or return back:";
                        buttons = [
                            ...specialties.map(specialty => ({
                                text: specialty,
                                class: 'specialty-button',
                                onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                        conversationState.stage = 5;
                        conversationState.isMedicalInquiry = false;
                    } else if (message.toLowerCase() === 'no') {
                        reply = "Thank you so much for visiting the website.";
                        hideInput = true;
                        conversationState.stage = 5;
                        conversationState.isMedicalInquiry = false;
                    } else if (message === 'medical_inquiry') {
                        reply = "Please ask your medical-related question or return back.";
                        buttons = [
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = false;
                        hideInput = false;
                        conversationState.stage = 9;
                        conversationState.isMedicalInquiry = true;
                        isMedicalInquiry = true;
                    } else if (message === 'return_back') {
                        reply = "Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        disableInput = false;
                        hideInput = true;
                        conversationState.stage = 4;
                        conversationState.isMedicalInquiry = false;
                    } else {
                        reply = "Please respond with 'Yes', 'No', or 'Ask Medical Related'.";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                    }
                    break;

                case 5:
                    if (message.startsWith('select_specialty:')) {
                        const rawSpecialty = message.split(':')[1];
                        const normalizedSpecialty = normalizeString(rawSpecialty);
                        console.log('Raw specialty:', rawSpecialty, 'Normalized specialty:', normalizedSpecialty);
                        // Find the original specialty case
                        const specialtyIndex = normalizedSpecialties.indexOf(normalizedSpecialty);
                        const specialty = specialtyIndex !== -1 ? specialties[specialtyIndex] : null;
                        console.log('Matched specialty:', specialty);
                        if (specialty && doctors[specialty]) {
                            conversationState.selectedSpecialty = specialty;
                            reply = `Please select a doctor for ${specialty} or return back:`;
                            buttons = [
                                ...doctors[specialty].map(doctor => ({
                                    text: doctor.name,
                                    class: 'specialty-button',
                                    onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(specialty)}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                            conversationState.stage = 6;
                        } else {
                            console.error('Invalid specialty or no doctors:', { rawSpecialty, normalizedSpecialty, specialty });
                            reply = "Invalid specialty selected. Please try again.";
                            buttons = [
                                ...specialties.map(specialty => ({
                                    text: specialty,
                                    class: 'specialty-button',
                                    onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                        }
                    } else if (message === 'return_back') {
                        reply = "Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            ...specialties.map(specialty => ({
                                text: specialty,
                                class: 'specialty-button',
                                onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                        conversationState.stage = 4;
                    } else {
                        console.error('Invalid message in stage 5:', message);
                        reply = "Please select a specialty or return back:";
                        buttons = [
                            ...specialties.map(specialty => ({
                                text: specialty,
                                class: 'specialty-button',
                                onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                    }
                    break;

                case 6:
                    if (message.startsWith('select_doctor:')) {
                        const parts = message.split(':');
                        if (parts.length < 3) {
                            console.error('Invalid select_doctor message format:', message);
                            reply = "Invalid doctor selection. Please try again.";
                            buttons = [
                                ...doctors[conversationState.selectedSpecialty].map(doctor => ({
                                    text: doctor.name,
                                    class: 'specialty-button',
                                    onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                            res.json({ reply, buttons, disableInput, hideInput, isMedicalInquiry });
                            return;
                        }
                        const rawDoctor = parts[1];
                        const doctor = normalizeString(rawDoctor);
                        const rawSpecialty = parts[2];
                        const specialty = conversationState.selectedSpecialty || normalizeString(rawSpecialty);
                        if (doctors[specialty] && doctors[specialty].some(d => normalizeString(d.name) === doctor)) {
                            conversationState.selectedDoctor = doctors[specialty].find(d => normalizeString(d.name) === doctor).name;
                            reply = `Please select a time slot for ${conversationState.selectedDoctor} or return back:`;
                            buttons = [
                                ...timeSlots.map(timeSlot => ({
                                    text: timeSlot,
                                    class: 'time-slot-button',
                                    onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(conversationState.selectedDoctor)}","${sanitizeString(specialty)}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                            conversationState.stage = 7;
                        } else {
                            console.error('Validation failed:', { rawDoctor, doctor, rawSpecialty, specialty });
                            reply = "Invalid doctor selected. Please try again.";
                            buttons = [
                                ...doctors[specialty].map(doctor => ({
                                    text: doctor.name,
                                    class: 'specialty-button',
                                    onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(specialty)}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                        }
                    } else if (message === 'return_back') {
                        reply = "Please select a specialty or return back:";
                        buttons = [
                            ...specialties.map(specialty => ({
                                text: specialty,
                                class: 'specialty-button',
                                onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                        conversationState.stage = 5;
                    } else {
                        console.error('Invalid message in stage 6:', message);
                        reply = `Please select a doctor for ${conversationState.selectedSpecialty} or return back:`;
                        buttons = [
                            ...doctors[conversationState.selectedSpecialty].map(doctor => ({
                                text: doctor.name,
                                class: 'specialty-button',
                                onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                    }
                    break;

                case 7:
                    if (message.startsWith('select_time:')) {
                        const parts = message.split(':');
                        if (parts.length < 4) {
                            console.error('Invalid select_time message format:', message);
                            reply = "Invalid time slot selection. Please try again.";
                            buttons = [
                                ...timeSlots.map(timeSlot => ({
                                    text: timeSlot,
                                    class: 'time-slot-button',
                                    onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(conversationState.selectedDoctor || '')}","${sanitizeString(conversationState.selectedSpecialty || '')}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                            res.json({ reply, buttons, disableInput, hideInput, isMedicalInquiry });
                            return;
                        }
                        const rawTimeSlot = parts[1];
                        const timeSlot = normalizeTimeSlot(rawTimeSlot);
                        const rawDoctor = parts[2];
                        const doctor = conversationState.selectedDoctor || normalizeString(rawDoctor);
                        const specialty = conversationState.selectedSpecialty;
                        const isValidSpecialty = specialty && specialties.includes(specialty) && doctors[specialty];
                        const isValidDoctor = isValidSpecialty && doctors[specialty].some(d => normalizeString(d.name) === doctor);

                        if (isValidSpecialty && isValidDoctor) {
                            const doctorEmail = doctors[specialty].find(d => normalizeString(d.name) === doctor).email;
                            try {
                                const response = await fetch('http://localhost:3000/api/book-appointment', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        patientEmail: conversationState.userEmail,
                                        doctorEmail,
                                        doctorName: doctor,
                                        timeSlot
                                    })
                                });
                                const data = await response.json();
                                if (response.ok && data.success) {
                                    reply = `Your appointment with ${doctor} on ${timeSlot} IST has been successfully confirmed. A confirmation email has been sent to ${conversationState.userEmail}. Kindly arrive 10 minutes prior to your scheduled appointment time.`;
                                    buttons = [];
                                    disableInput = true;
                                    hideInput = true;
                                    conversationState = {
                                        stage: 8,
                                        userName: null,
                                        userEmail: null,
                                        selectedSpecialty: null,
                                        selectedDoctor: null,
                                        isMedicalInquiry: false
                                    };
                                } else {
                                    console.error('Booking failed:', data.error);
                                    reply = "Failed to book appointment. Please try again.";
                                    buttons = [
                                        ...timeSlots.map(timeSlot => ({
                                            text: timeSlot,
                                            class: 'time-slot-button',
                                            onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(doctor)}","${sanitizeString(specialty)}")`
                                        })),
                                        { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                                    ];
                                    disableInput = true;
                                    hideInput = true;
                                }
                            } catch (error) {
                                console.error('Error booking appointment:', error.message);
                                reply = `Error booking appointment: ${error.message}. Please try again.`;
                                buttons = [
                                    ...timeSlots.map(timeSlot => ({
                                        text: timeSlot,
                                        class: 'time-slot-button',
                                        onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(doctor)}","${sanitizeString(specialty)}")`
                                    })),
                                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                                ];
                                disableInput = true;
                                hideInput = true;
                            }
                        } else {
                            console.error('Validation failed:', {
                                doctor,
                                isValidDoctor,
                                specialty,
                                isValidSpecialty
                            });
                            reply = `Invalid selection: ${!isValidSpecialty ? 'Specialty' : 'Doctor'} is invalid. Please try again.`;
                            buttons = [
                                ...timeSlots.map(timeSlot => ({
                                    text: timeSlot,
                                    class: 'time-slot-button',
                                    onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(conversationState.selectedDoctor || '')}","${sanitizeString(conversationState.selectedSpecialty || '')}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                        }
                    } else if (message === 'return_back') {
                        reply = `Please select a doctor for ${conversationState.selectedSpecialty} or return back:`;
                        buttons = [
                            ...doctors[conversationState.selectedSpecialty].map(doctor => ({
                                text: doctor.name,
                                class: 'specialty-button',
                                onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                        conversationState.stage = 6;
                    } else {
                        console.error('Invalid message in stage 7:', message);
                        reply = `Please select a time slot for ${conversationState.selectedDoctor} or return back:`;
                        buttons = [
                            ...timeSlots.map(timeSlot => ({
                                text: timeSlot,
                                class: 'time-slot-button',
                                onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(conversationState.selectedDoctor || '')}","${sanitizeString(conversationState.selectedSpecialty || '')}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                    }
                    break;

                case 8:
                    reply = "Your appointment is confirmed. To book another appointment or ask a medical question, please start over.";
                    buttons = [];
                    disableInput = true;
                    hideInput = true;
                    break;

                case 9:
                    if (message === 'return_back') {
                        reply = "Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        disableInput = false;
                        hideInput = true;
                        conversationState.stage = 4;
                        conversationState.isMedicalInquiry = false;
                    } else if (isMedicalRelated(message)) {
                        reply = await queryGrokAPI(message);
                        buttons = [
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = false;
                        hideInput = false;
                        conversationState.stage = 9;
                        conversationState.isMedicalInquiry = true;
                        isMedicalInquiry = true;
                    } else if (isGreeting(message)) {
                        reply = "Hello! I'm here to help with your medical questions. Please ask something like 'What causes leg pain?' or select 'Return Back'.";
                        buttons = [
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = false;
                        hideInput = false;
                        conversationState.stage = 9;
                        conversationState.isMedicalInquiry = true;
                        isMedicalInquiry = true;
                    } else {
                        reply = "Please ask a medical-related question (e.g., about symptoms, treatments, or conditions) or return back.";
                        buttons = [
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = false;
                        hideInput = false;
                        conversationState.isMedicalInquiry = true;
                        isMedicalInquiry = true;
                    }
                    break;

                default:
                    console.error('Invalid stage:', conversationState.stage);
                    reply = "Do you want to book an appointment or ask a medical-related question?";
                    buttons = [
                        { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                        { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                        { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                    ];
                    hideInput = true;
                    conversationState.stage = 4;
                    conversationState.isMedicalInquiry = false;
            }
        }
    } catch (error) {
        console.error('Server error in /api/chat:', error.message);
        reply = `Server error: ${error.message}. Please try again.`;
        buttons = [
            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
        ];
        disableInput = true;
        hideInput = true;
        conversationState.stage = 4;
        conversationState.isMedicalInquiry = false;
    }

    console.log('Sending response:', { reply, buttons: buttons.map(b => b.text), isMedicalInquiry });
    res.json({ reply, buttons, disableInput, hideInput, isMedicalInquiry });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});