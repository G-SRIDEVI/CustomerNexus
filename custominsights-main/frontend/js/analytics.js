// ================================
// Load Analytics Dashboard
// ================================

async function loadAnalytics() {

    try {

        // Fetch Monthly Revenue
        const monthlyResponse = await fetch("http://localhost:5000/api/analytics/monthly");
        const monthlyData = await monthlyResponse.json();

        // Fetch Category Distribution
        const categoryResponse = await fetch("http://localhost:5000/api/analytics/categories");
        const categoryData = await categoryResponse.json();

        // ===========================
        // Monthly Revenue Chart
        // ===========================

        const months = monthlyData.map(item => {

            const monthNames = [
                "",
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec"
            ];

            return monthNames[item._id.month];

        });

        const revenue = monthlyData.map(item => item.revenue);

        const sales = document.getElementById("salesChart");

        new Chart(sales, {

            type: "line",

            data: {

                labels: months,

                datasets: [{

                    label: "Revenue",

                    data: revenue,

                    borderWidth: 3,

                    tension: 0.4,

                    fill: false

                }]

            },

            options: {

                responsive: true

            }

        });

        // ===========================
        // Category Pie Chart
        // ===========================

        const categories = categoryData.map(item => item._id);

        const categoryCount = categoryData.map(item => item.count);

        const pie = document.getElementById("pieChart");

        new Chart(pie, {

            type: "pie",

            data: {

                labels: categories,

                datasets: [{

                    data: categoryCount

                }]

            }

        });

        // ===========================
        // Vendor Performance
        // (Temporary Demo Chart)
        // ===========================

        const vendor = document.getElementById("vendorChart");

        new Chart(vendor, {

            type: "bar",

            data: {

                labels: ["Tech Store"],

                datasets: [{

                    label: "Orders",

                    data: [4]

                }]

            },

            options: {

                responsive: true

            }

        });

    }

    catch (error) {

        console.error(error);

    }

}

loadAnalytics();