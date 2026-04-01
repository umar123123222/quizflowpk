CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'teacher'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );

  -- If organization_owner, auto-create their organization
  if (new.raw_user_meta_data->>'role') = 'organization_owner' then
    insert into public.organizations (name, owner_id)
    values (
      coalesce(new.raw_user_meta_data->>'full_name', 'My Organization'),
      new.id
    );
  end if;

  -- If teacher selected an organization, link them
  if (new.raw_user_meta_data->>'role') = 'teacher' 
     and (new.raw_user_meta_data->>'organization_id') is not null 
     and (new.raw_user_meta_data->>'organization_id') != '' then
    insert into public.organization_teachers (organization_id, teacher_id)
    values (
      (new.raw_user_meta_data->>'organization_id')::uuid,
      new.id
    );
  end if;

  return new;
end;
$function$;