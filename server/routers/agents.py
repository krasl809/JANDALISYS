from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import get_current_user_obj, require_permission
from models.core_models import Agent
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/agents", tags=["agents"])

class AgentCreate(BaseModel):
    contact_name: str
    code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class AgentUpdate(BaseModel):
    contact_name: Optional[str] = None
    code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

@router.get("/")
def get_agents(db: Session = Depends(get_db), current_user=Depends(require_permission("view_agents"))):
    return db.query(Agent).all()

@router.post("/")
def create_agent(agent: AgentCreate, db: Session = Depends(get_db), current_user=Depends(require_permission("manage_agents"))):
    db_agent = Agent(**agent.dict())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent

@router.put("/{agent_id}")
def update_agent(agent_id: str, agent: AgentUpdate, db: Session = Depends(get_db), current_user=Depends(require_permission("manage_agents"))):
    db_agent = db.query(Agent).filter(Agent.id == uuid.UUID(agent_id)).first()
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for key, value in agent.dict(exclude_unset=True).items():
        setattr(db_agent, key, value)
    db.commit()
    db.refresh(db_agent)
    return db_agent

@router.delete("/{agent_id}")
def delete_agent(agent_id: str, db: Session = Depends(get_db), current_user=Depends(require_permission("manage_agents"))):
    db_agent = db.query(Agent).filter(Agent.id == uuid.UUID(agent_id)).first()
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(db_agent)
    db.commit()
    return {"message": "Agent deleted"}
