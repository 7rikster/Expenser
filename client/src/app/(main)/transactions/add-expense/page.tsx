import { defaultCategories } from "@/lib/data";
import AddExpenseForm from "@/module/transaction/components/add-expense-form";

function AddExpense() {
    return ( 
        <div className="max-w-3xl mx-auto px-5 bg-card py-8 rounded-lg shadow">
            <AddExpenseForm 
                categories={defaultCategories}
            />
        </div>
     );
}

export default AddExpense;