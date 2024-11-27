// GitHub API configuration
const REPO_OWNER = "dbanda99";
const REPO_NAME = "open-up-data";
const FILE_PATH = "members.json";
const API_KEY = $${{ secrets.API_KEY }};

// Initialize the page and attach event listeners
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("login-tab").addEventListener("click", showLogin);
    document.getElementById("register-tab").addEventListener("click", showRegister);

    document.getElementById("login-button").addEventListener("click", handleLogin);
    document.getElementById("register-button").addEventListener("click", handleRegister);

    // Add event listener for logo click
    document.querySelector(".logo img").addEventListener("click", redirectToArrivalPage);

    // Add event listener for "Open Up" text click
    document.querySelector("h1.logo-text").addEventListener("click", redirectToArrivalPage);

    // Event listener for profile picture dropdown
    const profilePictureDropdown = document.getElementById("profile-picture");
    const profilePicturePreview = document.getElementById("profile-picture-preview");
    profilePictureDropdown.addEventListener("change", () => {
        const selectedValue = profilePictureDropdown.value;
        if (selectedValue) {
            profilePicturePreview.src = selectedValue; // Update the preview image
            profilePicturePreview.style.display = "block"; // Ensure the image is displayed
        } else {
            profilePicturePreview.style.display = "none"; // Hide the preview if no selection
        }
    });

    showLogin(); // Default view
});

// Redirect to arrival page when logo or "Open Up" text is clicked
function redirectToArrivalPage() {
    window.location.href = "arrival-page.html"; // Replace with the actual path to your arrival page
}

// Show the Login Form
function showLogin() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("register-form").style.display = "none";

    document.getElementById("login-tab").classList.add("active");
    document.getElementById("register-tab").classList.remove("active");
}

// Show the Register Form
function showRegister() {
    document.getElementById("register-form").style.display = "block";
    document.getElementById("login-form").style.display = "none";

    document.getElementById("register-tab").classList.add("active");
    document.getElementById("login-tab").classList.remove("active");
}

// Fetch members.json content from GitHub
async function fetchMembers() {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`
            }
        });

        if (response.status === 404) {
            throw new Error("File not found. Ensure 'members.json' exists in the repository.");
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch members.json: ${response.statusText}`);
        }

        const data = await response.json();
        const content = atob(data.content); // Decode base64 content
        return JSON.parse(content); // Parse JSON
    } catch (error) {
        console.error("Error fetching members:", error.message);
        alert("Error fetching members data. Please check your network or API configuration.");
        return [];
    }
}

// Update members.json on GitHub
async function updateMembers(newMembers) {
    try {
        const getResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`
            }
        });

        if (!getResponse.ok) {
            throw new Error("Failed to retrieve SHA for members.json");
        }

        const getData = await getResponse.json();
        const sha = getData.sha;

        const updatedContent = btoa(JSON.stringify(newMembers, null, 2)); // Encode content in Base64

        const updateResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update members.json",
                content: updatedContent,
                sha: sha
            })
        });

        if (!updateResponse.ok) {
            throw new Error("Failed to update members.json");
        }
    } catch (error) {
        console.error("Error updating members:", error.message);
        alert("Error updating members data. Please try again later.");
    }
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert("Please fill in all fields!");
        return;
    }

    const members = await fetchMembers();
    const user = members.find(member => member.email === email && member.password === password);

    if (user) {
        // Save logged-in user info to localStorage
        localStorage.setItem("loggedUser", JSON.stringify(user));

        alert("Login successful!");
        location.href = "dashboard.html"; // Redirect to dashboard
    } else {
        alert("Incorrect Email or Password. Please try again!");
    }
}

// Handle Register
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById("register-name").value; // Fetching new Name field
    const email = document.getElementById("register-email").value;
    const confirmEmail = document.getElementById("register-confirm-email").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;
    const profilePicture = document.getElementById("profile-picture").value; // Fetching selected profile picture

    if (!name || !email || !confirmEmail || !password || !confirmPassword) {
        alert("Please fill in all fields!");
        return;
    }

    if (email !== confirmEmail) {
        alert("Emails do not match!");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    const members = await fetchMembers();
    const userExists = members.some(member => member.email === email);

    if (userExists) {
        alert("User already exists! Please log in instead.");
        return;
    }

    const newUser = {
        name: name,
        email: email,
        password: password,
        "profile-picture": profilePicture,
    };

    members.push(newUser);

    await updateMembers(members);

    // Save registered user info to localStorage
    localStorage.setItem("loggedUser", JSON.stringify(newUser));

    alert("Account successfully created!");
    location.href = "dashboard.html"; // Redirect to dashboard
}
