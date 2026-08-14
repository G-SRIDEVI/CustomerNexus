async function loadProducts() {

    try {

        const response = await fetch("http://localhost:5000/api/products");

        const products = await response.json();

        const table = document.getElementById("productTable");

        table.innerHTML = "";

        products.forEach(product => {

            table.innerHTML += `
                <tr>
                    <td>${product.name}</td>

                    <td>${product.category}</td>

                    <td>${product.vendor}</td>

                    <td>₹${product.price}</td>

                    <td>${product.stock}</td>

                    <td>${product.status}</td>

                    <td>
                        <button class="edit">Edit</button>
                        <button class="delete">Delete</button>
                    </td>

                </tr>
            `;

        });

    }

    catch(error){

        console.log(error);

    }

}

loadProducts();