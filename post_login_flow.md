# User Dashboard & Resource Allocation Flow

Here is the flow of how a user will experience the platform after logging in, particularly focusing on renting and managing Storage and Compute (EC2) resources.

```mermaid
flowchart TD
    %% Define Styles
    classDef default fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#1e293b,font-family:Inter;
    classDef userAction fill:#c8f542,stroke:#65a30d,stroke-width:2px,color:#1e293b,font-weight:bold;
    classDef platformLogic fill:#5E9F71,stroke:#14532d,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef uiScreen fill:#ffffff,stroke:#94a3b8,stroke-width:2px,stroke-dasharray: 5 5,color:#1e293b;

    %% Flow Steps
    A([User Logs In]) -.-> B
    
    subgraph Dashboard[Dashboard / Overview Screen]
        B{Does User have <br/> active resources?}
        B -- No --> C[Show Empty State: <br/> 'No Active Resources']:::uiScreen
        B -- Yes --> D[Show Resource Metrics: <br/> CPU, Storage, Network]:::uiScreen
    end

    C --> E(Click 'Deploy Resource' / 'Rent'):::userAction
    
    subgraph ProvisioningWizard[Resource Provisioning Wizard]
        E --> F[Select Resource Type: <br/> Compute Node / Storage Bucket]:::uiScreen
        F --> G[Select Tier/Plan: <br/> Free, Solo Dev, Pro Dev]:::uiScreen
        G --> H(Confirm & Checkout):::userAction
    end

    subgraph BackendAllocation[Backend Automation]
        H --> I[Payment Processed / Verified]:::platformLogic
        I --> J[Assign 'tenantId' to User]:::platformLogic
        J --> K[Provision Cloud Infrastructure <br/> Docker/EC2/S3]:::platformLogic
    end

    K -.-> |Redirect back| L([Success Notification])
    L -.-> D
    
    subgraph ActiveManagement[Resource Management]
        D --> M[View Server Logs & Health]:::uiScreen
        D --> N[Upload/Manage Files in Storage]:::uiScreen
        D --> O[Manage Billing & Upgrades]:::uiScreen
    end
```

### Flow Breakdown for Profile/Dashboard:

1. **The Empty State (No Tenant ID yet)**: 
   When the user logs in for the first time, they don't have a `tenantId`. The dashboard should have a beautiful empty state (e.g., a "Create your first node" button, or "Deploy Storage" card) encouraging them to pick a plan from the landing page.
   
2. **The Provisioning Wizard**: 
   When they click "Rent" or "Create", they enter a step-by-step wizard. They select compute size, storage amount, region, etc. 

3. **Backend Magic**: 
   Once they checkout, your backend assigns them a `tenantId` (creating their isolated workspace) and starts spinning up the server/storage.

4. **The Active Dashboard (Tenant ID present)**: 
   Now, when they visit their dashboard, they see live metrics. You can show:
   - **Compute**: CPU usage, RAM usage, Uptime, Server IP, SSH Keys.
   - **Storage**: Total GB used, File Explorer, Access Keys.
   - **Billing**: Current cycle cost.
