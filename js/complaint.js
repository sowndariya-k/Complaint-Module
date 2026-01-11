import { db, storage } from "./firebase.js";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// DOM Elements
const complaintForm = document.getElementById('complaintForm');
const resetBtn = document.getElementById('resetBtn');
const submitBtn = document.getElementById('submitBtn');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const successAlert = document.getElementById('successAlert');
const errorAlert = document.getElementById('errorAlert');
const submitSpinner = document.getElementById('submitSpinner');
const complaintId = document.getElementById('complaintId');
const goToTrackBtn = document.getElementById('goToTrackBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const trackBtn = document.getElementById('trackBtn');
const trackSpinner = document.getElementById('trackSpinner');
const trackingId = document.getElementById('trackingId');
const complaintDetails = document.getElementById('complaintDetails');
const statusTimeline = document.querySelector('.status-timeline');

// Validation Error elements
const validationErrors = {
    fullName: document.getElementById('fullNameError'),
    voterId: document.getElementById('voterIdError'),
    complaintType: document.getElementById('complaintTypeError'),
    incidentDate: document.getElementById('incidentDateError'),
    description: document.getElementById('descriptionError'),
    contactInfo: document.getElementById('contactInfoError')
};

// Store last submitted data for receipt generation
let lastSubmittedData = null;
let currentTrackingData = null;

// Set date constraints
const incidentDate = document.getElementById('incidentDate');
const now = new Date();
incidentDate.max = now.toISOString().slice(0, 16);
incidentDate.min = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 16);

// Utility functions
const showError = (message) => {
    errorAlert.textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => errorAlert.style.display = 'none', 5000);
};

const showSuccess = () => {
    successAlert.style.display = 'block';
};

const hideAllValidationErrors = () => {
    Object.values(validationErrors).forEach(error => error.style.display = 'none');
};

const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const getComplaintTypeText = (value) => {
    const select = document.getElementById('complaintType');
    const option = Array.from(select.options).find(opt => opt.value === value);
    return option ? option.text : value;
};

const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Copy complaint ID (Attached to window for HTML onclick access)
window.copyComplaintId = () => {
    navigator.clipboard.writeText(complaintId.textContent)
        .then(() => alert('Complaint ID copied to clipboard'))
        .catch(() => alert('Failed to copy complaint ID'));
};

// Download Receipt Function
window.downloadReceipt = () => {
    let data = null;
    let id = null;

    // Determine if we are downloading from Tracking view or Submission view
    const trackTab = document.querySelector('.tab[data-tab="track-complaint"]');
    if (trackTab && trackTab.classList.contains('active') && currentTrackingData) {
        data = currentTrackingData;
        id = trackingId.value;
    } else if (lastSubmittedData) {
        data = lastSubmittedData;
        id = complaintId.textContent;
    }

    if (!data) {
        alert('No complaint data available to download.');
        return;
    }

    // Handle date format (Firestore Timestamp vs Form String)
    let incDate = data.incidentDate;
    if (incDate && typeof incDate === 'object' && incDate.toDate) {
        incDate = incDate.toDate().toLocaleString();
    }

    const content = `VOTING COMPLAINT RECEIPT
------------------------
Complaint ID: ${id}
Date Generated: ${new Date().toLocaleString()}

Status: ${data.status || 'Received'}
Name: ${data.fullName}
Type: ${getComplaintTypeText(data.complaintType)}
Incident Date: ${incDate}
Description: ${data.description}

Please keep this ID safe to track your complaint status.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Complaint_${complaintId.textContent}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
};

// Event Listeners
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
        
        successAlert.style.display = 'none';
        errorAlert.style.display = 'none';
        complaintDetails.style.display = 'none';
    });
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showError('File size exceeds 5MB limit');
            e.target.value = '';
            fileName.textContent = 'No file selected';
            return;
        }
        fileName.textContent = file.name;
    } else {
        fileName.textContent = 'No file selected';
    }
});

goToTrackBtn.addEventListener('click', () => {
    const id = complaintId.textContent;
    if (id) {
        // 1. Switch Tab UI manually (More reliable than .click())
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        const trackTab = document.querySelector('.tab[data-tab="track-complaint"]');
        const trackContent = document.getElementById('track-complaint');
        
        if (trackTab) trackTab.classList.add('active');
        if (trackContent) trackContent.classList.add('active');
        
        // 2. Fill ID and fetch data directly
        trackingId.value = id;
        fetchComplaintDetails(id);
    }
});

resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
        complaintForm.reset();
        fileName.textContent = 'No file selected';
        successAlert.style.display = 'none';
        errorAlert.style.display = 'none';
        hideAllValidationErrors();
    }
});

// Check Local Storage on Load
document.addEventListener('DOMContentLoaded', () => {
    const savedId = localStorage.getItem('lastComplaintId');
    if (savedId) {
        trackingId.value = savedId;
    }
});

// Refactored: Reusable function to fetch and display complaint details
const fetchComplaintDetails = async (id) => {
    if (!db) {
        showError('Database connection not available');
        return;
    }

    trackSpinner.style.display = 'block';
    trackBtn.disabled = true;
    
    // Hide previous results while loading
    complaintDetails.style.display = 'none';
    statusTimeline.style.display = 'none';
    currentTrackingData = null;

    try {
        const docRef = doc(db, 'complaints', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            currentTrackingData = data;

            const statusBadge = document.getElementById('statusValue');
            statusBadge.textContent = data.status || 'Received';
            statusBadge.className = `status-badge status-${data.status.toLowerCase().replace(' ', '-') || 'received'}`;

            document.getElementById('typeValue').textContent = getComplaintTypeText(data.complaintType);
            document.getElementById('dateValue').textContent = data.submittedAt ? formatDate(data.submittedAt.toDate()) : 'N/A';
            document.getElementById('descriptionValue').textContent = data.description || 'No description provided';

            document.getElementById('receivedDate').textContent = data.submittedAt ? formatDate(data.submittedAt.toDate()) : 'N/A';

            const resolutionNoteRow = document.getElementById('resolutionNoteRow');
            const cancellationReasonRow = document.getElementById('cancellationReasonRow');
            resolutionNoteRow.style.display = data.resolutionNote ? 'block' : 'none';
            cancellationReasonRow.style.display = data.cancellationReason ? 'block' : 'none';
            document.getElementById('resolutionNoteValue').textContent = data.resolutionNote || 'N/A';
            document.getElementById('cancellationReasonValue').textContent = data.cancellationReason || 'N/A';

            const timelineItems = {
                reviewing: document.getElementById('reviewingItem'),
                investigating: document.getElementById('investigatingItem'),
                resolved: document.getElementById('resolvedItem'),
                canceled: document.getElementById('canceledItem')
            };

            Object.values(timelineItems).forEach(item => item.classList.remove('active', 'canceled'));

            if (data.status === 'Under Review' || data.status === 'Investigating' || data.status === 'Resolved' || data.status === 'Canceled') {
                timelineItems.reviewing.classList.add('active');
                document.getElementById('reviewDate').textContent = data.reviewDate ? 
                    formatDate(data.reviewDate.toDate()) : 'In Progress';
            }

            if (data.status === 'Investigating' || data.status === 'Resolved' || data.status === 'Canceled') {
                timelineItems.investigating.classList.add('active');
                document.getElementById('investigateDate').textContent = data.investigateDate ? 
                    formatDate(data.investigateDate.toDate()) : 'In Progress';
            }

            if (data.status === 'Resolved') {
                timelineItems.resolved.classList.add('active');
                document.getElementById('resolveDate').textContent = data.resolveDate ? 
                    formatDate(data.resolveDate.toDate()) : 'Completed';
            }

            if (data.status === 'Canceled') {
                timelineItems.canceled.classList.add('canceled');
                document.getElementById('cancelDate').textContent = data.cancelDate ? 
                    formatDate(data.cancelDate.toDate()) : 'Canceled';
            }

            complaintDetails.style.display = 'block';
            statusTimeline.style.display = 'block';
        } else {
            showError('No complaint found with that ID');
            complaintDetails.style.display = 'none';
            statusTimeline.style.display = 'none';
        }
    } catch (error) {
        console.error('Error tracking complaint:', error);
        showError('An error occurred while tracking the complaint. Please try again.');
    } finally {
        trackSpinner.style.display = 'none';
        trackBtn.disabled = false;
    }
};

trackBtn.addEventListener('click', () => {
    const id = trackingId.value.trim();
    if (!id) {
        showError('Please enter a complaint ID');
        return;
    }
    fetchComplaintDetails(id);
});

complaintForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAllValidationErrors();

    if (!db || !storage) {
        showError('Database connection not available');
        return;
    }

    const formData = {
        fullName: complaintForm.fullName.value.trim(),
        voterId: complaintForm.voterId.value.trim(),
        complaintType: complaintForm.complaintType.value,
        incidentDate: complaintForm.incidentDate.value,
        location: complaintForm.location.value.trim(),
        description: complaintForm.description.value.trim(),
        contactInfo: complaintForm.contactInfo.value.trim()
    };

    let isValid = true;

    if (!formData.fullName) { validationErrors.fullName.style.display = 'block'; isValid = false; }
    if (!formData.voterId || (!validateEmail(formData.voterId) && !/^[A-Z0-9]{10}$/.test(formData.voterId))) { validationErrors.voterId.style.display = 'block'; isValid = false; }
    if (!formData.complaintType) { validationErrors.complaintType.style.display = 'block'; isValid = false; }
    if (!formData.incidentDate || new Date(formData.incidentDate) > new Date()) { validationErrors.incidentDate.style.display = 'block'; isValid = false; }
    if (!formData.description || formData.description.length < 10) { validationErrors.description.style.display = 'block'; isValid = false; }
    if (!formData.contactInfo || (!validateEmail(formData.contactInfo) && !/^\+?[\d\s-]{10,}$/.test(formData.contactInfo))) { validationErrors.contactInfo.style.display = 'block'; isValid = false; }

    if (!isValid) return;

    submitSpinner.style.display = 'block';
    submitBtn.disabled = true;

    try {
        const complaintData = {
            ...formData,
            incidentDate: Timestamp.fromDate(new Date(formData.incidentDate)),
            status: 'Received',
            submittedAt: Timestamp.now(),
            fileUrl: null
        };

        const file = fileInput.files[0];
        if (file) {
            uploadProgress.style.display = 'block';
            const storageRef = ref(storage, `evidence/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.style.width = progress + '%';
                    },
                    (error) => reject(error),
                    async () => {
                        complaintData.fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });
        }

        const docRef = await addDoc(collection(db, 'complaints'), complaintData);
        complaintId.textContent = docRef.id;
        
        // Save to local storage and memory for receipt
        localStorage.setItem('lastComplaintId', docRef.id);
        lastSubmittedData = formData;

        showSuccess();

        // Auto-switch to track tab
        setTimeout(() => {
            goToTrackBtn.click();
            // Switch Tab UI manually
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            const trackTab = document.querySelector('.tab[data-tab="track-complaint"]');
            const trackContent = document.getElementById('track-complaint');
            
            if (trackTab) trackTab.classList.add('active');
            if (trackContent) trackContent.classList.add('active');
            
            // Fill ID and fetch data
            trackingId.value = docRef.id;
            fetchComplaintDetails(docRef.id);
        }, 800);

        // Form reset and cleanup (No mailto logic here)
        complaintForm.reset();
        fileName.textContent = 'No file selected';
        uploadProgress.style.display = 'none';
    } catch (error) {
        console.error('Error submitting complaint:', error);
        let errorMessage = 'Failed to submit complaint. Please try again.';
        if (error.code === 'permission-denied') errorMessage = 'Permission denied. Please ensure you have the necessary permissions.';
        else if (error.code === 'unavailable') errorMessage = 'Database is currently unavailable. Please try again later.';
        showError(errorMessage);
    } finally {
        submitSpinner.style.display = 'none';
        submitBtn.disabled = false;
        uploadProgress.style.display = 'none';
    }
});
