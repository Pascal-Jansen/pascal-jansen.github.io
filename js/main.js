$(document).ready(function() {
    $('header nav ul li a').click(function() {
        var section = $(this).attr('href');
        if (!section || section.charAt(0) !== '#') return;

        var toggle = document.getElementById('nav-toggle');
        if (toggle) toggle.checked = false;
    });

    $('.burger_icon').click(function() {
        $('header nav').toggleClass('show');
        $('header .burger_icon').toggleClass('active');
    });
    
    options = {
        offset: '#showHere',
        offsetSide: 'top',
        classes: {
            clone: 'banner--clone',
            stick: 'banner--stick',
            unstick: 'banner--unstick'
        }
    };
    
    banner = new Headhesive('.banner', options);
    
    wow = new WOW({
        animateClass: 'animated',
        mobile: false,
        offset: 50
    });
    
    wow.init();
    
    $('.bio').parallax("50%", 0.3);
    
    $('#play_video').click(function(e) {
        e.preventDefault();
        var video_link = $(this).data('video');
        video_link = '<iframe src="' + video_link + '" width="500" height="208" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
        $('.about_video').append(video_link).fadeIn(200);
    });
    
    $('.close_video').click(function(e) {
        e.preventDefault();
        $('.about_video').fadeOut(200, function() {
            $('iframe', this).remove();
        });
    });

    initializePublicationAbstractButtons();
});

function setAbstractButtonState(button, target, isOpen) {
    if (!button) return;

    button.type = 'button';
    button.classList.toggle('is-open', isOpen);
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (target) {
        button.setAttribute('data-abstract-target', target);
        button.setAttribute('aria-controls', target);
    }

    button.textContent = isOpen ? 'Hide abstract' : 'Show abstract';
}

function initializePublicationAbstractButtons() {
    document.querySelectorAll('button.abstract-btn').forEach((button) => {
        const inlineHandler = button.getAttribute('onclick') || '';
        const match = inlineHandler.match(/'([^']+)'/);
        const target = match ? match[1] : button.getAttribute('data-abstract-target');
        const abstract = target ? document.getElementById(target) : null;
        const isOpen = !!abstract && window.getComputedStyle(abstract).display !== 'none';

        setAbstractButtonState(button, target, isOpen);

        if (abstract) {
            abstract.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }
    });
}

function toggleAbstract(button, target) {    
    var abstract = document.getElementById(target);
    if (!abstract) return;

    var opening = window.getComputedStyle(abstract).display === "none";
    abstract.style.display = opening ? "block" : "none";
    abstract.setAttribute('aria-hidden', opening ? 'false' : 'true');
    setAbstractButtonState(button, target, opening);
}
