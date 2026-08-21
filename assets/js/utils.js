const ClubUtils = {
    // Show premium Swal alert
    showAlert: function(title, text, icon = 'info', confirmText = 'Đồng ý') {
        return Swal.fire({
            title: title,
            text: text,
            icon: icon,
            confirmButtonColor: '#2563eb',
            confirmButtonText: confirmText,
            customClass: {
                popup: 'premium-swal-popup'
            }
        });
    },

    // Show premium Swal confirmation
    showConfirm: function(title, text, confirmText = 'Đồng ý', cancelText = 'Hủy') {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#67748e',
            confirmButtonText: confirmText,
            cancelButtonText: cancelText
        });
    },

    // Toast Notification generator
    showToast: function(title, text, type = 'success') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: type,
            title: title,
            html: text,
            background: document.body.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff',
            color: document.body.getAttribute('data-theme') === 'dark' ? '#f9fafb' : '#0f172a'
        });
    },

    // Format: DD-MM-YYYY
    formatDateOnly: function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    },

    // Format: DD-MM-YYYY HH:mm:ss
    formatDateTime: function(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            // Handle strings like "2026-07-05 14:00" or "2026-07-05"
            const parts = dateStr.split(' ');
            const datePart = parts[0] ? parts[0].split('-') : [];
            const timePart = parts[1] || '';
            if (datePart.length === 3) {
                const formatted = `${datePart[2]}-${datePart[1]}-${datePart[0]}`;
                return timePart ? `${formatted} ${timePart}:00` : formatted;
            }
            return dateStr;
        }
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
    },

    // Alias for backward compat
    formatDate: function(dateStr) {
        return this.formatDateOnly(dateStr);
    },

    // Current datetime string: DD-MM-YYYY HH:mm:ss
    nowString: function() {
        return this.formatDateTime(new Date().toISOString());
    },

    // Save action logging
    addLog: function(action) {
        const currentUser = JSON.parse(sessionStorage.getItem("club_current_user"));
        const username = currentUser ? currentUser.username : "Ẩn danh";
        const logs = ClubStorage.getData("club_logs") || [];
        const time = this.nowString();
        logs.unshift({ time, user: username, action });
        ClubStorage.saveData("club_logs", logs.slice(0, 200));
    },

    // Theme state load
    initTheme: function() {
        const savedTheme = localStorage.getItem('club_theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        return savedTheme;
    },

    toggleTheme: function() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('club_theme', newTheme);
        return newTheme;
    },

    // One-Way SHA-256 Password Hashing
    sha256: function(ascii) {
        if (!ascii) return "";
        function rightRotate(value, amount) {
            return (value>>>amount) | (value<<(32-amount));
        }
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var lengthProperty = 'length';
        var i, j;
        var result = '';
        var words = [];
        var asciiBitLength = ascii[lengthProperty]*8;
        var hash = ClubUtils._sha256_h = ClubUtils._sha256_h || [];
        var k = ClubUtils._sha256_k = ClubUtils._sha256_k || [];
        var primeCounter = k[lengthProperty];

        var isPrime = function(candidate) {
            for (var factor = 2; factor < candidate; factor++) {
                if (candidate % factor === 0) return false;
            }
            return true;
        };

        if (!primeCounter) {
            for (var candidate = 2; primeCounter < 64; candidate++) {
                if (isPrime(candidate)) {
                    hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
                    k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
                }
            }
        }

        ascii += '\x80';
        while (ascii[lengthProperty]%64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) {
            j = ascii.charCodeAt(i);
            if (j>>8) return;
            words[i>>2] |= j << ((3 - i%4)*8);
        }
        words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
        words[words[lengthProperty]] = (asciiBitLength);

        for (j = 0; j < words[lengthProperty];) {
            var w = words.slice(j, j += 16);
            var oldHash = hash;
            hash = hash.slice(0, 8);
            for (i = 0; i < 64; i++) {
                var i2 = i + j;
                var w15 = w[i - 15], w2 = w[i - 2];
                var a = hash[0], e = hash[4];
                var temp1 = hash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & hash[5]) ^ ((~e) & hash[6]))
                    + k[i]
                    + (w[i] = (i < 16) ? w[i] : (
                            w[i - 16]
                            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                            + w[i - 7]
                            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                        )|0
                    );
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                    + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

                hash = [(temp1 + temp2)|0].concat(hash);
                hash[4] = (hash[4] + temp1)|0;
            }
            for (i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i])|0;
            }
        }

        for (i = 0; i < 8; i++) {
            for (j = 3; j >= 0; j--) {
                var b = (hash[i] >> (j * 8)) & 255;
                result += (b < 16 ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }
};

// Auto run theme setup
document.addEventListener("DOMContentLoaded", () => {
    ClubUtils.initTheme();
});
