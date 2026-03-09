from dotenv import load_dotenv
from crewai import Crew, Process

# 1. LOAD THE ENVIRONMENT VARIABLES (API KEYS)
load_dotenv()

# 2. IMPORT THE AGENT NODES
# This pulls the agents and their specific tasks from your other files
from pm import product_manager, pm_task
from dev1 import backend_developer, dev1_task
from dev2 import react_developer, dev2_task

# 3. ASSEMBLE THE CREW
# We place the agents and tasks in the exact order they need to run.
# Process.sequential means Dev1 won't start until the PM finishes, 
# and Dev2 won't start until Dev1 finishes.
universal_accounting_crew = Crew(
    agents=[product_manager, backend_developer, react_developer],
    tasks=[pm_task, dev1_task, dev2_task],
    process=Process.sequential 
)

# 4. RUN THE COMPANY
if __name__ == "__main__":
    print("========================================")
    print("🚀 Initializing Universal Accounting System Build...")
    print("========================================")
    
    # Kickoff starts the assembly line
    result = universal_accounting_crew.kickoff()
    
    print("========================================")
    print("✅ FINAL OUTPUT (FRONTEND CODE DELIVERED):")
    print("========================================")
    print(result)