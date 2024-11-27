document.addEventListener("DOMContentLoaded", () => {
    const addComplimentButton = document.querySelector(".add-button");
    const newComplimentWindow = document.querySelector(".new-compliment-window");
    const closeButton = document.querySelector(".close-button");
    const postButton = document.querySelector(".post-button");
    const recipientInput = document.querySelector("#recipient-name");
    const messageInput = document.querySelector("#message");
    const postsContainer = document.querySelector("#posts-container");
    const suggestionBox = document.querySelector("#suggestion-box");
    const charCountDisplay = document.querySelector("#char-count");
    const navbarRight = document.querySelector(".navbar-right");
    const API_KEY = process.env.API_KEY;

    const githubApiUrl = "https://api.github.com/repos/dbanda99/open-up-data/contents/compliment-posts.json";
    const membersApiUrl = "https://api.github.com/repos/dbanda99/open-up-data/contents/members.json";
    const githubToken = `Bearer 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`;

    // Display logged-in user profile in the navbar
    const displayUserProfile = async () => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        if (loggedUser) {
            try {
                // Fetch members to ensure up-to-date profile data
                const membersResponse = await fetch(membersApiUrl, {
                    headers: {
                        Authorization: githubToken,
                    },
                });
                if (!membersResponse.ok) throw new Error("Failed to fetch member data.");

                const membersData = await membersResponse.json();
                const members = JSON.parse(atob(membersData.content));

                // Find the logged-in user's profile
                const userProfile = members.find((member) => member.email === loggedUser.email);

                // Update loggedUser with profile picture if available
                if (userProfile) {
                    loggedUser.profilePicture = userProfile["profile-picture"] || "images/default-profile-img.png";
                    localStorage.setItem("loggedUser", JSON.stringify(loggedUser));
                }

                // Update navbar content
                navbarRight.innerHTML = `
                    <span class="navbar-user-name" style="cursor: pointer;">${loggedUser.name}</span>
                    <img class="profile-icon" src="${loggedUser.profilePicture}" alt="Profile Icon" style="cursor: pointer;">
                `;

                // Redirect to User Profile Page when clicked
                const profileName = document.querySelector(".navbar-user-name");
                const profilePicture = document.querySelector(".profile-icon");
                if (profileName && profilePicture) {
                    profileName.addEventListener("click", () => {
                        window.location.href = "user-profile.html";
                    });
                    profilePicture.addEventListener("click", () => {
                        window.location.href = "user-profile.html";
                    });
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        } else {
            console.error("No logged-in user data found in localStorage.");
            navbarRight.innerHTML = `
                <span class="navbar-user-name" style="cursor: pointer;">Guest</span>
                <img class="profile-icon" src="images/default-profile-img.png" alt="Profile Icon" style="cursor: pointer;">
            `;
        }
    };

    // Fetch compliments from GitHub
    const fetchCompliments = async () => {
        try {
            const response = await fetch(githubApiUrl, {
                headers: {
                    Authorization: githubToken,
                },
            });
            if (!response.ok) throw new Error("Failed to fetch compliments data.");
            const data = await response.json();
            const compliments = JSON.parse(atob(data.content)); // Decode base64 content
            displayCompliments(compliments);
        } catch (error) {
            console.error("Error fetching compliments:", error);
            postsContainer.innerHTML = `<p>Error loading posts. Please try again later.</p>`;
        }
    };

    // Display compliments in the dashboard
    const displayCompliments = (compliments) => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        postsContainer.innerHTML = ""; // Clear existing posts
        compliments
            .sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated)) // Sort by newest first
            .forEach((compliment, index) => {
                const hasUserLiked = loggedUser && compliment.likes.users.includes(loggedUser.email);
                const postCard = document.createElement("div");
                postCard.className = "post-card";
                postCard.innerHTML = `
                    <img class="profile-image" src="${compliment.sender.profileImage || 'images/default-profile-img.png'}" alt="Sender Image">
                    <div class="post-content">
                        <h3>Anonymous to ${compliment.receiver.name}</h3>
                        <p class="time">${compliment.timeCreated}</p>
                        <p>${compliment.message}</p>
                        <div class="post-actions">
                            <span>${compliment.likes.count} - Loved</span>
                            <i class="bi ${hasUserLiked ? "bi-heart-fill" : "bi-heart"} like-icon" data-index="${index}" style="cursor: pointer; color: ${hasUserLiked ? "red" : "gray"};"></i>
                        </div>
                    </div>
                `;
                postsContainer.appendChild(postCard);
            });

        // Add event listeners to Like buttons
        document.querySelectorAll(".like-icon").forEach((icon) => {
            icon.addEventListener("click", () => toggleLike(icon.dataset.index));
        });
    };

    // Toggle like status for a compliment
    const toggleLike = async (index) => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        if (!loggedUser) return;

        try {
            const sha = await getFileSha();
            const response = await fetch(githubApiUrl, {
                headers: {
                    Authorization: githubToken,
                },
            });

            if (!response.ok) throw new Error("Failed to fetch compliments.");
            const data = await response.json();
            const compliments = JSON.parse(atob(data.content));
            const compliment = compliments[index];

            if (compliment.likes.users.includes(loggedUser.email)) {
                // Unlike the post
                compliment.likes.count -= 1;
                compliment.likes.users = compliment.likes.users.filter((user) => user !== loggedUser.email);
            } else {
                // Like the post
                compliment.likes.count += 1;
                compliment.likes.users.push(loggedUser.email);
            }

            const updateResponse = await fetch(githubApiUrl, {
                method: "PUT",
                headers: {
                    Authorization: githubToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: "Update likes",
                    content: btoa(JSON.stringify(compliments, null, 2)), // Encode to base64
                    sha: sha, // Use the latest SHA
                }),
            });

            if (!updateResponse.ok) throw new Error("Failed to update likes.");
            fetchCompliments(); // Refresh compliments after like toggle
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    };

    // Fetch the latest SHA of the compliments file
    const getFileSha = async () => {
        const response = await fetch(githubApiUrl, {
            headers: {
                Authorization: githubToken,
            },
        });
        if (!response.ok) throw new Error("Failed to fetch file SHA.");
        const data = await response.json();
        return data.sha;
    };

    // Clear form and reset suggestions
    const resetComplimentForm = () => {
        recipientInput.value = "";
        messageInput.value = "";
        suggestionBox.innerHTML = "";
        charCountDisplay.textContent = "0/2,500 characters";
    };

    // Update character count in the message input
    messageInput.addEventListener("input", () => {
        charCountDisplay.textContent = `${messageInput.value.length}/2,500 characters`;
    });

    // Event listener for recipient input suggestions
    recipientInput.addEventListener("input", async () => {
        const inputText = recipientInput.value.trim().toLowerCase();
        if (inputText === "") {
            suggestionBox.innerHTML = "";
            return;
        }

        try {
            const membersResponse = await fetch(membersApiUrl, {
                headers: {
                    Authorization: githubToken,
                },
            });

            if (!membersResponse.ok) throw new Error("Failed to fetch member data.");
            const membersData = await membersResponse.json();
            const members = JSON.parse(atob(membersData.content));

            const filteredMembers = members.filter((member) =>
                member.name.toLowerCase().includes(inputText)
            );

            suggestionBox.innerHTML = filteredMembers
                .map((member) => `<p class="suggestion-item" data-name="${member.name}">${member.name}</p>`)
                .join("");

            // Add click listener for suggestions
            document.querySelectorAll(".suggestion-item").forEach((item) => {
                item.addEventListener("click", (e) => {
                    recipientInput.value = e.target.getAttribute("data-name");
                    suggestionBox.innerHTML = ""; // Clear suggestions
                });
            });
        } catch (error) {
            console.error("Error fetching member suggestions:", error);
        }
    });

    // Event listener for posting a new compliment
    postButton.addEventListener("click", async () => {
        const recipient = recipientInput.value.trim();
        const message = messageInput.value.trim();

        if (!recipient || !message) {
            alert("Please fill out both fields before posting.");
            return;
        }

        const currentTime = new Date();
        const formattedTime = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const formattedDate = currentTime.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit" });

        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));

        try {
            const membersResponse = await fetch(membersApiUrl, {
                headers: {
                    Authorization: githubToken,
                },
            });

            if (!membersResponse.ok) throw new Error("Failed to fetch member data.");
            const membersData = await membersResponse.json();
            const members = JSON.parse(atob(membersData.content));

            const targetMember = members.find(
                (member) => member.name.toLowerCase() === recipient.toLowerCase()
            );

            if (!targetMember) {
                alert("Recipient not found. Please select a valid recipient.");
                return;
            }

            const newCompliment = {
                sender: {
                    name: "Anonymous",
                    email: loggedUser ? loggedUser.email : "anonymous@unknown.com",
                },
                receiver: {
                    name: targetMember.name,
                    email: targetMember.email,
                },
                message: message,
                timeCreated: `${formattedTime} - ${formattedDate}`,
                likes: {
                    count: 0,
                    users: [],
                },
            };

            const sha = await getFileSha(); // Get the latest SHA
            const existingDataResponse = await fetch(githubApiUrl, {
                headers: {
                    Authorization: githubToken,
                },
            });

            if (!existingDataResponse.ok) throw new Error("Failed to fetch existing compliments.");
            const existingData = await existingDataResponse.json();
            const compliments = JSON.parse(atob(existingData.content));
            compliments.unshift(newCompliment); // Add new compliment to the top of the list

            const updateResponse = await fetch(githubApiUrl, {
                method: "PUT",
                headers: {
                    Authorization: githubToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: "Add new compliment",
                    content: btoa(JSON.stringify(compliments, null, 2)), // Encode to base64
                    sha: sha, // Use the latest SHA
                }),
            });

            if (!updateResponse.ok) throw new Error("Failed to update compliments.");
            fetchCompliments(); // Refresh compliments after successful post

            // Clear the form and close the window
            resetComplimentForm();
            newComplimentWindow.style.display = "none";
        } catch (error) {
            console.error("Error posting new compliment:", error);
        }
    });

    // Event listener for the Add Compliment Button
    addComplimentButton.addEventListener("click", () => {
        resetComplimentForm();
        newComplimentWindow.style.display = "block";
    });

    // Event listener for the Close Button
    closeButton.addEventListener("click", () => {
        resetComplimentForm();
        newComplimentWindow.style.display = "none";
    });

    // Load compliments and user profile on page load
    displayUserProfile();
    fetchCompliments();
});
