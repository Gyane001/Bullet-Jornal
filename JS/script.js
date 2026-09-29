"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.getElementById("menuButton");
    const closeMenuButton = document.getElementById("closeMenuButton");
    const sideMenu = document.getElementById("sideMenu");
    const menuOverlay = document.getElementById("menuOverlay");

    if (!menuButton || !closeMenuButton || !sideMenu || !menuOverlay) {
        console.error("Não foi possível iniciar o menu: falta um elemento necessário no HTML.");
        return;
    }

    function openMenu() {
        sideMenu.classList.add("open");
        menuOverlay.classList.add("visible");
        menuButton.setAttribute("aria-expanded", "true");
        sideMenu.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {
        sideMenu.classList.remove("open");
        menuOverlay.classList.remove("visible");
        menuButton.setAttribute("aria-expanded", "false");
        sideMenu.setAttribute("aria-hidden", "true");
    }

    function toggleMenu() {
        const isOpen = sideMenu.classList.contains("open");

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    menuButton.addEventListener("click", toggleMenu);
    closeMenuButton.addEventListener("click", closeMenu);
    menuOverlay.addEventListener("click", closeMenu);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    document.querySelectorAll("[data-menu-action]").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".menu-item").forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");
            closeMenu();
        });
    });
});