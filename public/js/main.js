// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        if (navMenu.classList.contains('active')) {
            navMenu.style.display = 'flex';
            navMenu.style.flexDirection = 'column';
            navMenu.style.position = 'absolute';
            navMenu.style.top = '70px';
            navMenu.style.left = '0';
            navMenu.style.width = '100%';
            navMenu.style.backgroundColor = 'white';
            navMenu.style.padding = '2rem';
            navMenu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        } else {
            navMenu.style.display = '';
        }
    });
}

const servicesData = [
    {
        id: 1,
        title: 'Авиаперевозки',
        description: 'Быстрая доставка грузов по всему миру. Оптимально для срочных и ценных отправлений.',
        icon: '✈️',
        features: ['1-3 дня', 'От 5 кг', 'Страхование']
    },
    {
        id: 2,
        title: 'Морские перевозки',
        description: 'Экономичное решение для крупных партий товаров. Полный спектр услуг FCL и LCL.',
        icon: '🚢',
        features: ['20-40 дней', 'Контейнеры', 'Порты мира']
    },
    {
        id: 3,
        title: 'Автоперевозки',
        description: 'Наземная доставка по Европе и СНГ. Контроль температуры для чувствительных грузов.',
        icon: '🚚',
        features: ['2-7 дней', 'FTL/LTL', 'Термоконтроль']
    },
    {
        id: 4,
        title: 'Ж/Д перевозки',
        description: 'Надёжная альтернатива морским перевозкам. Идеально для тяжёлых и объёмных грузов.',
        icon: '🚂',
        features: ['7-14 дней', 'Вагоны', 'Любые габариты']
    },
    {
        id: 5,
        title: 'Складские услуги',
        description: 'Временное хранение, маркировка, упаковка и кросс-докинг на современных складах.',
        icon: '🏪',
        features: ['До 90 дней', 'WMS система', 'Персонал']
    },
    {
        id: 6,
        title: 'Таможенное оформление',
        description: 'Полное брокерское сопровождение. Декларирование, сертификация и консультации.',
        icon: '📋',
        features: ['Электронная подача', 'Консалтинг', 'Сертификация']
    }
];

const servicesGrid = document.getElementById('services-grid');

if (servicesGrid) {
    servicesData.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        const featuresHtml = service.features.map(feature => 
            `<span class="feature">${feature}</span>`
        ).join('');
        
        card.innerHTML = `
            <div class="service-icon">${service.icon}</div>
            <h3>${service.title}</h3>
            <p>${service.description}</p>
            <div class="service-features">
                ${featuresHtml}
            </div>
            <a href="#" class="service-link">
                Узнать подробнее
                <i class="fas fa-arrow-right"></i>
            </a>
        `;
        
        servicesGrid.appendChild(card);
    });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.05)';
    }
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.service-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'all 0.6s ease';
    observer.observe(card);
});

window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});