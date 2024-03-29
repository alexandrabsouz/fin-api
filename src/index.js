const { request } = require("express")
const express = require("express")
const {v4: uuidv4} = require("uuid")

const app = express()
const customers = []

app.use(express.json())

function verifyIfExistsAccountCPF(request, response, next){
    const { cpf } = request.headers
    const customer = customers.find((customer) => customer.cpf === cpf)

    if(!customer){
        return response.status(400). json({
            "error": "customer not found"
        })
    }

    request.customer = customer

    return next()
}

function getBalance(statement){
    const balance = statement.reduce((acc, operation) => {
        if(operation.type === "credit"){
            return acc + operation.amount
        } else {
            return acc - operation.amount
        }
    }, 0)
    return balance
}

app.post("/account", (request, response) => {
    const {cpf, name} = request.body
    const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf)

    if(customerAlreadyExists){
        return response.status(400).json({
            "error": "customer already exists!"
        })
    }

    customers.push({
        id: uuidv4(),
        cpf,
        name,
        statement: []
    })

    return response.status(201).send()
})

//app.use(verifyIfExistsAccountCPF)
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {

    const { customer } = request
    
    return response.status(200).json({
        "extrato": customer.statement
    })
})

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { description, amount} = request.body

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    const { customer } = request

    customer.statement.push(statementOperation)

    return response.status(201).json({
        "success": "deposito feito com sucesso."
    })
})

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body
    const { customer } = request

    const balance = getBalance(customer.statement)

    if(balance < amount){
        return response.status(400).json({error: "there is no account balance."})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation)
    return response.status(201).json({"success": "account withdrawal completed"}).send()
})

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {

    const { customer } = request
    const { date } = request.query
    
    const dateFormat = new Date( date + " 00:00")

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString())

    return response.status(200).json({
        "extrato": statement
    })
})


app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body
    const { customer } = request

    customer.name = name

    return response.status(201).json({
        "success": "name changed successfully",
        "person": {"name": customer.name}
    })

})

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request
    customers.splice(customer, 1)

    return response.status(200).json({"success": "account deleted"})
})


app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request

    const balance = getBalance(customer.statement)

    return response.status(200).json({
        "balance": balance
    })
})

app.listen(3001)